var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as puppeteer from "puppeteer";
import fs from "fs";
const IS_ECONOMY_MODE = true;
// to do
// 2. обгорути в функцію відловлювання помилок
function fileExists(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs.promises.access(filePath, fs.constants.F_OK);
            return true;
        }
        catch (err) {
            return false;
        }
    });
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const browser = yield puppeteer.launch();
    const page = yield browser.newPage();
    yield page.goto("https://auctions.royaltyexchange.com/accounts/login/");
    yield page.setViewport({ width: 390, height: 844 });
    // логінимся
    yield page.waitForSelector("input");
    page.focus("input[type=email]");
    yield page.type("input[type=email]", "rudenko.albert.n@gmail.com");
    yield page.focus("input[type=password]");
    yield page.type("input[type=password]", "rj2CMr$4TGW9HcY");
    yield page.click("button[type=submit]");
    yield new Promise((resolve) => setTimeout(resolve, 5000));
    yield page
        .waitForSelector(".leadinModal-overlay", { timeout: 60000 })
        .then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield page.click(".leadinModal-overlay");
    }));
    // відкриваємо всі картки
    yield new Promise((resolve) => setTimeout(resolve, 2000));
    const spans = yield page.$$("span");
    for (const span of spans) {
        const text = yield span.evaluate((node) => node.innerText);
        if (text === "View All Open Listings") {
            yield span.click();
            break;
        }
    }
    yield new Promise((resolve) => setTimeout(resolve, 6000));
    // відкриваємо по черзі сторінки карток
    for (let j = 1; j <= 41; j++) {
        const pagination = yield page.$$("button");
        for (const button of pagination) {
            const number = yield button.evaluate((node) => node.innerText);
            if (number === j.toString()) {
                button.click();
                break;
            }
        }
        yield new Promise((resolve) => setTimeout(resolve, 4000));
        // збираємо всі лінки на сторінки карток
        yield page.waitForSelector("span");
        const listSpans = yield page.$$("span");
        let listingButtons = [];
        for (const span of listSpans) {
            const text = yield span.evaluate((node) => node.innerText);
            if (text === "View Listing") {
                listingButtons.push(span);
            }
        }
        for (let i = 0; i < listingButtons.length; i++) {
            yield listingButtons[i].click();
            yield new Promise((resolve) => setTimeout(resolve, 5000));
            const newPage = (yield browser.pages())[2];
            if (newPage === null)
                throw new Error("newPage is null");
            yield newPage.setViewport({ width: 390, height: 844 });
            // збираємо данні
            let currentAsset = {
                id: "",
                title: "",
                tags: [],
                coverImage: "",
                aboutAsset: {
                    "Last 12 Months Earnings": "",
                    "3-Year Average Earnings": "",
                    "Dollar Age": "",
                    "Tracks Included": "",
                    Type: "",
                    "Years Remaining": "",
                    "Expiration Date": "",
                    "Available Through": "",
                },
                currentOffer: {
                    "List Price": "",
                    LTM: "",
                    "Offers by investors": "",
                    "Offers by standing orders": "",
                },
                "Owner Last Active": "",
                "Offers History": [],
                "Other Information": "",
                media: [],
            };
            //  отримуємо id
            yield new Promise((resolve) => setTimeout(resolve, 6000));
            try {
                yield newPage.waitForXPath("/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[2]/h3");
                const id = (yield newPage.$x("/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[2]/h3"))[0];
                currentAsset.id = (_a = (yield id.evaluate((node) => node.textContent))) === null || _a === void 0 ? void 0 : _a.replace(/\D/g, "");
            }
            catch (e) {
                console.log(e);
                yield newPage.close();
                yield page.bringToFront();
                continue;
            }
            if (IS_ECONOMY_MODE) {
                const filename = `./data/${currentAsset.id}.json`;
                const exists = yield fileExists(filename);
                if (exists) {
                    yield newPage.close();
                    yield page.bringToFront();
                    continue;
                }
                else {
                    console.log(`Файл ${filename} не існує`);
                }
            }
            // отримуємо заголовок
            yield newPage.waitForXPath("/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[1]/h1");
            const title = (yield newPage.$x("/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[1]/h1"))[0];
            currentAsset.title = yield title.evaluate((node) => node.textContent);
            // отримуємо теги
            const tags = [];
            let tagHTML;
            let counter = 0;
            do {
                tagHTML = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[3]/div[${++counter}]`);
                if (tagHTML.length > 0) {
                    const tag = yield tagHTML[0].evaluate((node) => node.textContent);
                    tags.push(tag);
                }
            } while (tagHTML.length > 0);
            currentAsset.tags = tags;
            // отримуємо картинку
            const coverImage = yield newPage.$x("/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[1]/div/img");
            if (coverImage.length > 0) {
                let image = yield coverImage[0].evaluate((node) => node.src);
                currentAsset.coverImage = image;
            }
            // отримуємо данні про ассет
            // якщо відсутня картинка, то змінюємо шлях до інформації про асет
            let mode = 2;
            if (currentAsset.coverImage === "") {
                mode = 1;
            }
            const lastEarnings = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[1]/td[2]`);
            const averageEarnings = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[2]/td[2]`);
            const dollarAge = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[3]/td[2]`);
            const tracksIncluded = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[4]/td[2]`);
            const type = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[5]/td[2]`);
            const yearsRemaining = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[6]/td[2]`);
            const expirationDate = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[7]/td[2]`);
            const availableThrough = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[8]/td[2]`);
            currentAsset.aboutAsset["Last 12 Months Earnings"] =
                lastEarnings.length > 0
                    ? yield lastEarnings[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.aboutAsset["3-Year Average Earnings"] =
                averageEarnings.length > 0
                    ? yield averageEarnings[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.aboutAsset["Dollar Age"] =
                dollarAge.length > 0
                    ? yield dollarAge[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.aboutAsset["Tracks Included"] =
                tracksIncluded.length > 0
                    ? yield tracksIncluded[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.aboutAsset.Type =
                type.length > 0
                    ? yield type[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.aboutAsset["Years Remaining"] =
                yearsRemaining.length > 0
                    ? yield yearsRemaining[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.aboutAsset["Expiration Date"] =
                expirationDate.length > 0
                    ? yield expirationDate[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.aboutAsset["Available Through"] =
                availableThrough.length > 0
                    ? yield availableThrough[0].evaluate((node) => node.textContent)
                    : "";
            // отримуємо данні про офер
            // якщо відсутня картинка, то змінюємо шлях до інформації про асет
            mode = 4;
            if (currentAsset.coverImage === "") {
                mode = 3;
            }
            const listPrice = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[1]/td[1]/label`);
            const ltm = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[2]/td/span`);
            const offersByInvestors = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[3]/td[1]/div/label[1]`);
            const offersByStandingOrders = yield newPage.$x(`/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[3]/td[1]/div/label[2]`);
            currentAsset.currentOffer["List Price"] =
                listPrice.length > 0
                    ? yield listPrice[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.currentOffer.LTM =
                ltm.length > 0 ? yield ltm[0].evaluate((node) => node.textContent) : "";
            currentAsset.currentOffer["Offers by investors"] =
                offersByInvestors.length > 0
                    ? yield offersByInvestors[0].evaluate((node) => node.textContent)
                    : "";
            currentAsset.currentOffer["Offers by standing orders"] =
                offersByStandingOrders.length > 0
                    ? yield offersByStandingOrders[0].evaluate((node) => node.textContent)
                    : "";
            // отримуємо данні про останню активність
            const lastActivity = yield newPage.$x("/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[3]/table/tbody/tr[4]/td/div/div[2]/h2");
            currentAsset["Owner Last Active"] =
                lastActivity.length > 0
                    ? yield lastActivity[0].evaluate((node) => node.textContent)
                    : "";
            // отримуємо данні про офер хісторі
            // якщо відсутня картинка, то змінюємо шлях до інформації про асет
            // mode = 4;
            // if (currentAsset.coverImage === "") {
            //   mode = 3;
            // }
            // /html/body/main/div[2]/div/div[3]/div/div[3]/div/div[4]/div[3]/button
            // /html/body/main/div[2]/div/div[3]/div/div[3]/div/div[3]/div[3]/button
            // console.log("current id", currentAsset.id);
            // page.waitForXPath(
            //   `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div[3]/button`
            // );
            // const showOffersStats = await newPage.$x(
            //   `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div[3]/button`
            // );
            // await showOffersStats[0].evaluate((node: any) => node?.click());
            // await newPage.waitForSelector("#id-see-all-offers");
            // const showAllOffers = await newPage.$("#id-see-all-offers");
            // await showAllOffers?.click();
            // let numberOfOffers =
            //   Number(
            //     currentAsset.currentOffer["Offers by investors"]
            //       .replace(/\D/g, "")
            //       .trim()
            //   ) +
            //   Number(
            //     currentAsset.currentOffer["Offers by standing orders"]
            //       .replace(/\D/g, "")
            //       .trim()
            //   );
            // await new Promise((resolve) => setTimeout(resolve, 5000));
            // counter = 4;
            // let offers = [];
            // while (numberOfOffers > 0 && counter < 50) {
            //   const offer = await newPage.$x(
            //     `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div[1]/div/div/div[${counter}]/div/div[2]/div[1]/div[1]`
            //   );
            //   console.log("offer", offer);
            //   if (offer.length > 0) {
            //     offers.push(await offer[0].evaluate((node) => node.textContent));
            //     numberOfOffers--;
            //     console.log("numberOfOffers", numberOfOffers);
            //   }
            //   counter++;
            // }
            // currentAsset["Offers History"] = offers;
            // отримуємо данні про іншу інформацію
            // отримуємо данні про медіа
            yield newPage.waitForSelector("iframe");
            const frames = yield newPage.$$("iframe");
            let youtubePageLinks = [];
            for (const frame of frames) {
                const src = yield frame.evaluate((node) => node === null || node === void 0 ? void 0 : node.src);
                if (src === undefined)
                    continue;
                if (src.includes("youtube.com")) {
                    youtubePageLinks.push(src);
                }
            }
            youtubePageLinks = youtubePageLinks.map((item) => {
                const videoId = item.substring(item.lastIndexOf("/") + 1);
                return `https://www.youtube.com/watch?v=${videoId}`;
            });
            currentAsset.media = youtubePageLinks;
            // зберігаємо лінки в файл
            const json = JSON.stringify(currentAsset);
            fs.writeFile(`./data/${currentAsset.id}.json`, json, "utf8", (err) => {
                if (err) {
                    console.log("error: ", err);
                }
            });
            yield newPage.close();
            yield page.bringToFront();
        }
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const timestamp = `${hours}:${minutes}:${seconds}`;
        console.log(`[LOG]${timestamp}: Page ${j} was parsed`);
    }
    yield browser.close();
}))();
