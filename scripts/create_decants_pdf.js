const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const productsJson = fs.readFileSync(path.join(root, 'products.json'), 'utf8').replace(/^\uFEFF/, '');
const products = JSON.parse(productsJson);

const output = path.join(root, 'catalogo-perfumes.pdf');
const doc = new PDFDocument({ size: 'LETTER', margin: 42, bufferPages: true });
doc.pipe(fs.createWriteStream(output));

const priceValue = value => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
const money = value => priceValue(value) ? `L. ${priceValue(value).toLocaleString('en-US')}` : 'No disponible';
const usableImage = async image => {
    if (!image) return null;
    const extension = path.extname(image).toLowerCase();
    const fullPath = path.join(root, image);
    if (!fs.existsSync(fullPath)) return null;
    if (['.webp', '.avif'].includes(extension)) {
        return sharp(fullPath).png().toBuffer();
    }
    return ['.jpg', '.jpeg', '.png'].includes(extension) ? fullPath : null;
};

doc.fillColor('#171717').font('Helvetica-Bold').fontSize(24).text('AJRO Perfumes', { align: 'center' });
doc.moveDown(0.4).fillColor('#555555').font('Helvetica').fontSize(12)
    .text('Catálogo completo de perfumes', { align: 'center' });
doc.moveDown(0.3).fontSize(10).text(`${products.length} productos disponibles`, { align: 'center' });
doc.moveDown(1.2);

async function addProducts() {
    for (const product of products) {
        const fullPrice = priceValue(product.price_full ?? product.price);
        const price5 = priceValue(product.price_5ml);
        const price10 = priceValue(product.price_10ml);
        
        const image = await usableImage(product.image);
        const cardHeight = 140;
        if (doc.y + cardHeight > 735) doc.addPage();
        const top = doc.y;

        doc.roundedRect(42, top, 528, cardHeight, 8).fillAndStroke('#f7f7f7', '#dddddd');
        if (image) {
            doc.image(image, 58, top + 10, { fit: [100, 120], align: 'center', valign: 'center' });
        } else {
            doc.fillColor('#888888').fontSize(9).text('Imagen no disponible', 70, top + 60, { width: 75, align: 'center' });
        }

        const textX = 175;
        doc.fillColor('#171717').font('Helvetica-Bold').fontSize(12)
            .text(product.name || 'Producto sin nombre', textX, top + 12, { width: 360 });
        doc.fillColor('#666666').font('Helvetica').fontSize(9)
            .text((product.category || '') + ' | ' + (product.description || ''), textX, top + 38, { width: 360 });
        doc.fillColor('#222222').font('Helvetica-Bold').fontSize(11)
            .text(`Bote sellado: ${fullPrice ? money(fullPrice) : 'No disponible'}`, textX, top + 60, { width: 360 });

        doc.fillColor('#555555').font('Helvetica').fontSize(9)
            .text(`Decant 5 ml: ${money(price5)}  |  Decant 10 ml: ${money(price10)}`, textX, top + 80);
        doc.y = top + cardHeight + 12;
    }
}

async function generateCatalog() {
    await addProducts();
}

const range = doc.bufferedPageRange();
for (let page = range.start; page < range.start + range.count; page += 1) {
    doc.switchToPage(page);
    doc.fillColor('#888888').font('Helvetica').fontSize(8)
        .text(`AJRO Perfumes  |  Página ${page + 1} de ${range.count}`, 42, 750, { align: 'center', width: 528 });
}

generateCatalog().then(() => {
    doc.end();
    doc.on('end', () => console.log(`PDF generado: ${output}\nProductos incluidos: ${products.length}`));
});
