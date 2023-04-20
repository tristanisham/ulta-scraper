import { ElementHandle, Locator, Page } from "playwright";

export interface Product {
    id?: number
    name: string | null
    brand: string | null
    price?: string
    ingrediants?: string[]
    images?: string[]
}


/**
 * Extracts a product's price from a product card.
 * @param elem
 * @returns the product's price
 */
export async function price(elem: Locator): Promise<string> {
    const price = elem.locator(".ProductPricing")
    return Promise.resolve(await price.innerText())
}

/**
 *
 * @param elem Parent content element for products
 * @returns A string array of all ingredients or undefined if no ingredients are found.
 */
export async function ingredients(elem: Page): Promise<string[] | undefined> {
    if (elem.locator(".ProductDetail__Content") === null) return Promise.resolve(undefined)
    const ingred = await elem.locator("details").all();
    for (const ing of ingred) {
        if (await ing.innerText() == "Ingredients") {
            await ing.click();
            const md_bodies = await ing.locator("p").allInnerTexts()
            if (md_bodies.length === 0) return Promise.resolve(undefined);
        
            return Promise.resolve((await ingrediant_sifter(md_bodies)).split(","))
        }
    }
    if (!ingred) return Promise.resolve(undefined)
    
}

/**
 * Honestly, what're the odds something other than instructions will have a billion commas
 * and Water/Aqua/Eau listen in the same sentence?
 *
 * @param copy List of possible ingrediant elements
 */
async function ingrediant_sifter(copy: string[]): Promise<string> {
    let sift: { ratio: number, cp: string } = {
        ratio: 0,
        cp: ""
    };

    for (const ct of copy) {
        
        if (!ct || ct.length === 0) continue;
        console.log(ct)
        const spaces = ct.trim().split(" ")
        const commas = ct.trim().split(",")
        const ratio = commas.length / spaces.length;
        if (ratio === Infinity) continue;
        if (ratio > 0.85) {
            if (sift.ratio < ratio) {
                sift.ratio = ratio;
                sift.cp = ct;
            }

        }
    }

    return Promise.resolve(sift.cp)
}


export async function images(elem:Locator): Promise<string[]> {
    const images = await elem.locator("img").all()
    const image_urls: string[] = []
    for (const image of images) {
        const url = await image.getAttribute("src")
        if (url === null || !url.includes("http")) continue;

        image_urls.push(url)
    }

    return Promise.resolve(image_urls)
}