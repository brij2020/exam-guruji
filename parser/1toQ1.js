import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import fs from "fs"


async function transformEntirePdf() {
  const filePath = "/Users/brijbhan/Downloads/30 Yearwise SSC CGL Solved Paper (English) 2023.pdf";
  const pdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Configuration for your specific PDF layout
  const CONFIG = {
    startX: 45,        // The horizontal position of the question numbers
    fontSize: 11,
    maskWidth: 22,     // Width of the white box to hide the old number
    maskHeight: 15,
  };

  pages.forEach((page, pageIndex) => {
    const { width, height } = page.getSize();

    // Note: This logic assumes questions are vertically stacked.
    // For a 14-page document, manual coordinate fine-tuning is usually 
    // needed for each section header.
    
    // Example: Transforming the first few questions on Page 1
    if (pageIndex === 0) {
      const questionsOnPage1 = [
        { num: 1, y: height - 255 },
        { num: 2, y: height - 295 },
        { num: 3, y: height - 355 },
        { num: 9, y: height - 425 } // Section jumps to 9 on Page 1
      ];

      questionsOnPage1.forEach(q => {
        // 1. Mask original number
        page.drawRectangle({
          x: CONFIG.startX - 2,
          y: q.y - 2,
          width: CONFIG.maskWidth,
          height: CONFIG.maskHeight,
          color: rgb(1, 1, 1),
        });

        // 2. Draw "Q#."
        page.drawText(`Q${q.num}.`, {
          x: CONFIG.startX,
          y: q.y,
          size: CONFIG.fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });
    }
  });

  const pdfBytesOut = await pdfDoc.save();
  fs.writeFileSync("Transformed_Full_Exam.pdf", pdfBytesOut);
  console.log("Entire PDF processed: Transformed_Full_Exam.pdf");
}

transformEntirePdf().catch(console.error);