import { chromium } from "playwright-extra"
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fs from "node:fs/promises";
import { loadProducts, parse } from "./cli"
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha'
import process from "node:process";
import pc from "picocolors"
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

const ProductPageURLs = [
    "https://www.ulta.com/shop/makeup/all?sort=price_asc",
    "https://www.ulta.com/shop/skin-care/all?sort=price_asc",
    "https://www.ulta.com/shop/fragrance/all?sort=price_asc",
    "https://www.ulta.com/shop/bath-body/all?sort=price_asc",
    "https://www.ulta.com/shop/hair/all?sort=price_asc"
];



// Main
(async () => {
    const args = parse(process.argv.slice(2))
    await fs.mkdir("./data", { recursive: true })
    const db = await open({
        filename: "./data/ulta.db",
        driver: sqlite3.Database
    });

    await db.exec("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, brand TEXT, price TEXT, ingrediants TEXT, images TEXT);")

    chromium.use(StealthPlugin())
    if (args.captcha) {
        if (!process.env.TWOCAPTCHA_API_KEY) {
            console.error(pc.yellow(`Captcha solver enabled but no 2captcha.com api key found. Checked ENV ${pc.underline("2CAPTCHA_API_KEY")}`))
            process.exit(1)
        }
        chromium.use(RecaptchaPlugin({
            provider: {
              id: '2captcha',
              token: 'ENTER_YOUR_2CAPTCHA_API_KEY_HERE'
            }
          }))
    }
    
    const browser = await chromium.launch({ headless: args.headless });


    for await (const product of loadProducts(browser, ProductPageURLs)) {
        await db.run("INSERT INTO products (name, brand, price, ingrediants, images) VALUES (?,?,?,?,?)", [product.name, product.brand, product.price, product.ingrediants, product.images?.join(";")])
        console.log(pc.green(`Saved ${product.name}`)   )
    }
    await browser.close();
})();

