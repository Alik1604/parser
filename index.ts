import * as puppeteer from "puppeteer";
import fs from "fs";

const IS_ECONOMY_MODE = true;

// to do
// 2. обгорути в функцію відловлювання помилок

async function fileExists(filePath: string) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://auctions.royaltyexchange.com/accounts/login/");
  await page.setViewport({ width: 390, height: 844 });

  // логінимся
  await page.waitForSelector("input");
  page.focus("input[type=email]");
  await page.type("input[type=email]", "rudenko.albert.n@gmail.com");
  await page.focus("input[type=password]");
  await page.type("input[type=password]", "rj2CMr$4TGW9HcY");
  await page.click("button[type=submit]");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  await page
    .waitForSelector(".leadinModal-overlay", { timeout: 60000 })
    .then(async () => {
      await page.click(".leadinModal-overlay");
    });

  // відкриваємо всі картки
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const spans = await page.$$("span");

  for (const span of spans) {
    const text = await span.evaluate((node) => node.innerText);
    if (text === "View All Open Listings") {
      await span.click();
      break;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 6000));
  // відкриваємо по черзі сторінки карток

  for (let j = 1; j <= 41; j++) {
    const pagination = await page.$$("button");
    for (const button of pagination) {
      const number = await button.evaluate((node) => node.innerText);
      if (number === j.toString()) {
        button.click();
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
    // збираємо всі лінки на сторінки карток
    await page.waitForSelector("span");
    const listSpans = await page.$$("span");
    let listingButtons = [];

    for (const span of listSpans) {
      const text = await span.evaluate((node) => node.innerText);
      if (text === "View Listing") {
        listingButtons.push(span);
      }
    }

    for (let i = 0; i < listingButtons.length; i++) {
      await listingButtons[i].click();
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const newPage = (await browser.pages())[2];
      if (newPage === null) throw new Error("newPage is null");
      await newPage.setViewport({ width: 390, height: 844 });

      // збираємо данні
      let currentAsset: any = {
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

      await new Promise((resolve) => setTimeout(resolve, 6000));

      try {
        await newPage.waitForXPath(
          "/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[2]/h3"
        );
        const id = (
          await newPage.$x(
            "/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[2]/h3"
          )
        )[0];
        currentAsset.id = (
          await id.evaluate((node) => node.textContent)
        )?.replace(/\D/g, "");
      } catch (e) {
        console.log(e);
        await newPage.close();
        await page.bringToFront();
        continue;
      }

      if (IS_ECONOMY_MODE) {
        const filename = `./data/${currentAsset.id}.json`;
        const exists = await fileExists(filename);
        if (exists) {
          await newPage.close();
          await page.bringToFront();
          continue;
        } else {
          console.log(`Файл ${filename} не існує`);
        }
      }

      // отримуємо заголовок

      await newPage.waitForXPath(
        "/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[1]/h1"
      );
      const title = (
        await newPage.$x(
          "/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[1]/h1"
        )
      )[0];
      currentAsset.title = await title.evaluate((node) => node.textContent);

      // отримуємо теги

      const tags = [];
      let tagHTML;
      let counter = 0;
      do {
        tagHTML = await newPage.$x(
          `/html/body/main/div[2]/div/div[3]/div/div[2]/div/div[3]/div[${++counter}]`
        );
        if (tagHTML.length > 0) {
          const tag = await tagHTML[0].evaluate((node) => node.textContent);
          tags.push(tag);
        }
      } while (tagHTML.length > 0);
      currentAsset.tags = tags;

      // отримуємо картинку

      const coverImage = await newPage.$x(
        "/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[1]/div/img"
      );
      if (coverImage.length > 0) {
        let image = await coverImage[0].evaluate((node: any) => node.src);
        currentAsset.coverImage = image;
      }

      // отримуємо данні про ассет
      // якщо відсутня картинка, то змінюємо шлях до інформації про асет
      let mode = 2;
      if (currentAsset.coverImage === "") {
        mode = 1;
      }

      const lastEarnings = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[1]/td[2]`
      );
      const averageEarnings = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[2]/td[2]`
      );
      const dollarAge = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[3]/td[2]`
      );
      const tracksIncluded = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[4]/td[2]`
      );
      const type = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[5]/td[2]`
      );
      const yearsRemaining = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[6]/td[2]`
      );
      const expirationDate = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[7]/td[2]`
      );
      const availableThrough = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/div/table/tbody/tr[8]/td[2]`
      );

      currentAsset.aboutAsset["Last 12 Months Earnings"] =
        lastEarnings.length > 0
          ? await lastEarnings[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.aboutAsset["3-Year Average Earnings"] =
        averageEarnings.length > 0
          ? await averageEarnings[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.aboutAsset["Dollar Age"] =
        dollarAge.length > 0
          ? await dollarAge[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.aboutAsset["Tracks Included"] =
        tracksIncluded.length > 0
          ? await tracksIncluded[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.aboutAsset.Type =
        type.length > 0
          ? await type[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.aboutAsset["Years Remaining"] =
        yearsRemaining.length > 0
          ? await yearsRemaining[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.aboutAsset["Expiration Date"] =
        expirationDate.length > 0
          ? await expirationDate[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.aboutAsset["Available Through"] =
        availableThrough.length > 0
          ? await availableThrough[0].evaluate((node) => node.textContent)
          : "";

      // отримуємо данні про офер
      // якщо відсутня картинка, то змінюємо шлях до інформації про асет
      mode = 4;
      if (currentAsset.coverImage === "") {
        mode = 3;
      }

      const listPrice = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[1]/td[1]/label`
      );
      const ltm = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[2]/td/span`
      );
      const offersByInvestors = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[3]/td[1]/div/label[1]`
      );
      const offersByStandingOrders = await newPage.$x(
        `/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[${mode}]/table/tbody/tr[3]/td[1]/div/label[2]`
      );

      currentAsset.currentOffer["List Price"] =
        listPrice.length > 0
          ? await listPrice[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.currentOffer.LTM =
        ltm.length > 0 ? await ltm[0].evaluate((node) => node.textContent) : "";
      currentAsset.currentOffer["Offers by investors"] =
        offersByInvestors.length > 0
          ? await offersByInvestors[0].evaluate((node) => node.textContent)
          : "";
      currentAsset.currentOffer["Offers by standing orders"] =
        offersByStandingOrders.length > 0
          ? await offersByStandingOrders[0].evaluate((node) => node.textContent)
          : "";

      // отримуємо данні про останню активність

      const lastActivity = await newPage.$x(
        "/html/body/main/div[2]/div/div[3]/div/div[3]/div/div[3]/table/tbody/tr[4]/td/div/div[2]/h2"
      );
      currentAsset["Owner Last Active"] =
        lastActivity.length > 0
          ? await lastActivity[0].evaluate((node) => node.textContent)
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

      await newPage.waitForSelector("iframe");
      const frames = await newPage.$$("iframe");

      let youtubePageLinks = [];
      for (const frame of frames) {
        const src = await frame.evaluate((node: any) => node?.src);
        if (src === undefined) continue;
        if (src.includes("youtube.com")) {
          youtubePageLinks.push(src);
        }
      }

      youtubePageLinks = youtubePageLinks.map((item: any) => {
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

      await newPage.close();
      await page.bringToFront();
    }

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const timestamp = `${hours}:${minutes}:${seconds}`;
    console.log(`[LOG]${timestamp}: Page ${j} was parsed`);
  }

  await browser.close();
})();
