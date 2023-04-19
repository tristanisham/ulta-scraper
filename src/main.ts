import { chromium } from "playwright-extra"
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fs from "node:fs/promises";
import { loadProducts, parse } from "./cli"
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import process from "node:process";

const ProductURLs = [
    "https://www.ulta.com/shop/makeup/all?sort=price_asc",
    "https://www.ulta.com/shop/skin-care/all?sort=price_asc",
    "https://www.ulta.com/shop/fragrance/all?sort=price_asc",
    "https://www.ulta.com/shop/bath-body/all?sort=price_asc",
    "https://www.ulta.com/shop/hair/all?sort=price_asc"
];



// Main
(async () => {
    const args = parse(process.argv.slice(2))
    fs.mkdir("./data", { recursive: true }).catch(_ => console.info("Skipping data directory creation."))
    const db = await open({
        filename: "./data/ulta.db",
        driver: sqlite3.Database
    });

    await db.exec("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, brand TEXT, price TEXT, ingrediants TEXT, images TEXT);")

    const browser = await chromium.use(StealthPlugin()).launch({ headless: args.headless });


    for await (const product of loadProducts(browser, ProductURLs)) {
        await db.run("INSERT INTO products (name, brand, price, ingrediants, images) VALUES (?,?,?,?,?)", [product.name, product.brand, product.price, product.ingrediants, product.images?.join(";")])
    }
    await browser.close();
})();

