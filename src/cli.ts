import process from "node:process"
import { Browser } from "playwright";
import { Product, images, ingredients, price } from "./product";

interface Args {
    headless: boolean,
    captcha: boolean
}

/**
 * Parse program appropriate command from string slice.
 * @param args command-line array to parse
 * @returns {Args} object of acceptable parsed arguments and appropriate defaults.
 */
export function parse(args: string[]): Args {
    let out: Args = {
        headless: true,
        captcha: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--head":
                out.headless = false
                break;
            case "-h": case "--help": case "help":
                help();
                process.exit(0)
            case "--captcha":
                out.captcha = true;
        }
    }

    return out;
}

function help() {
    console.log([
        {
            "Command": "help",
            "Description": "Print these instructions",
            "Alts": ["-h", "--help"]
        },
        {
            "Flag": "--head",
            "Description": "Open the browser with a head. Helpful for debuging or sightseeing."
        },
        {
            "Flag": "--captcha",
            "Description": "Enable captcha solver"
        }
    ]);
}

/**
 * Iteratator for pulling products from Ulta.com
 * @param browser a browser interface from Playwright
 * @param prodPages An array of Ulta product pages
 */
export async function* loadProducts(browser: Browser, prodPages: string[]): AsyncGenerator<Product> {
    urls: for (let i = 0; i < prodPages.length; i++) {
        const url = new URL(prodPages[i]);
        // const ProdDb: Product[] = []

        const page = await browser.newPage()
        await page.goto(url.toString(), { waitUntil: "load" })
        if (typeof page.solveRecaptchas === "function") {
            await page.solveRecaptchas();
        }

        products: for (let pnum = 1; true; i++) {
            console.log(`Scanning ${url.toString()}...`)
            await page.waitForLoadState("domcontentloaded")
            await page.waitForTimeout(500)
            await page.waitForSelector(".ProductListingWrapper__resultslabel")
            await page.waitForSelector(".ProductCard")

            const products = await page.locator(".ProductCard").all();
            if (prodPages.length == 0) continue urls
            for (let n = 0; n < products.length; n++) {

                const product = products[n]
                // Product Name
                const name = product.locator(".ProductCard__product");
                // Product Brand
                const brands = product.locator(".ProductCard__brand")

                let out: Product = {
                    name: await name.textContent() || null,
                    brand: await brands.textContent() || null,
                    price: await price(product),

                }

                await product.click()
                console.log(`Moved to ${product.page().url()}`)
                try {
                    await page.waitForSelector(`.ProductDetail__Content`)
                    out.ingrediants = await ingredients(page)

                    out.images = await images(page.locator(".ProductHero__content"))
                } catch (e: any) {
                    if (e.name == "TimeoutError") {
                        console.log("Page timed out. Logging and moving on")
                        console.log(page.url())
                    }
                }

                await page.goBack()
                console.log(`Went back to ${product.page().url()}`)
                await page.waitForSelector(".ProductCard")
                yield out;
            }
            url.searchParams.set("page", String(pnum))
        }

    }

}
