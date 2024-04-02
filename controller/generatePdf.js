const puppeteer = require("puppeteer");
const exiftool = require('node-exiftool')
const crypto = require('crypto')
const { writeFileSync, readFileSync } = require('node:fs');

const generatePdf = async (type, payload) => {
  // Browser actions & buffer creator
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // SEE BELOW WARNING!!!
  });

  if (type === 'url') {
    const page = await browser.newPage();
    // Hash the request string to generate a unique temp file.
    const shasum = crypto.createHash('sha1')
    shasum.update(payload);
    await page.goto(payload);
    const language = await page.evaluate('document.querySelector("html").getAttribute("lang")') || 'en';
    await page.emulateMediaType("print");
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, tagged: true });
    await browser.close();

    // Add metadata to the file before returning.
    const ep = new exiftool.ExiftoolProcess('/usr/bin/exiftool');
    // Write the buffer to a temporary file.
    const tmpFileName = shasum.digest('hex') + '.pdf';
    const tmpFilePath = '/tmp/' + tmpFileName;
    writeFileSync(tmpFilePath, pdf);
    const tmpFileBuffer = readFileSync(tmpFilePath);

    // Detect the language.
    const title = language.startsWith('fr') ? "Lettre des contrats octroyés de Services publics et Approvisionnement Canada" : "Contract history letter from Public Services and Procurement Canada";
    const siteName = language.startsWith('fr') ? "AchatsCanada" : "CanadaBuys";
    const author = language.startsWith('fr') ? "Services publics et Approvisionnement Canada" : "Public Services and Procurement Canada";
    const subject = language.startsWith('fr') ? "Une lettre qui répertorie l'historique de vos contrats avec Services publics et Approvisionnement Canada." : "A letter that lists your contract history with Public Services and Procurement Canada.";
    const keywords = language.startsWith('fr') ? "Contrat, historique, lettre, Gouvernement du Canada, fournisseur, entreprise, contrats octroyés" : "contract, history, letter, Government of Canada, company, supplier, contracts awarded";
    
    // Add XML dc:title metadata to the file.
    await ep.open()
      .then(() => ep.writeMetadata(tmpFilePath, {
        Title: title,
        Producer: siteName,
        Creator: siteName,
        'Content Creator': author,
        Author: author,
        Keywords: keywords,
        Subject: subject }))
      .then(() => ep.close());

    // Return Buffer
    return readFileSync(tmpFilePath);
  }

  if (type === 'base64') {
    const page = await browser.newPage();
    await page.goto(`data:text/html;base64,${payload}`);
    const pdf = await page.pdf();
    await browser.close();
    // Return Buffer
    return pdf;
  }

};

/******************** WARNING ********************* WARNING ********************* WARNING *********************
 
 If you absolutely trust the content you open in Chrome, you can launch Chrome with the --no-sandbox argument...
 Running without a sandbox is strongly discouraged. Consider configuring a sandbox instead!!!

 More Info Here: https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md

******************** WARNING ********************* WARNING ********************* WARNING *********************/

module.exports = generatePdf;
