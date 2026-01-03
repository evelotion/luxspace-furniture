const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// --- 1. CONFIGURATION ---

// Config Cloudinary (Ambil dari .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Koneksi ke Database LOCAL (Sumber Data)
// Ganti user/password/db sesuai settingan pgAdmin lo
const localPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'luxespace_db',
  password: 'Babihutan12@',
  port: 5432,
});

// Koneksi ke Database NEON (Tujuan)
// Ini otomatis baca dari .env yang udah lo set buat Vercel tadi
const neonPool = new Pool({
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?sslmode=require`,
});

// --- 2. MIGRATION LOGIC ---

async function migrateProducts() {
  console.log('🚀 Mulai Migrasi Produk...');
  
  try {
    // A. Ambil semua produk dari Local
    const localProducts = await localPool.query('SELECT * FROM products');
    console.log(`📦 Ditemukan ${localProducts.rows.length} produk di local.`);

    for (const product of localProducts.rows) {
      console.log(`\nProcessing: ${product.name}...`);
      
      let finalImageUrl = product.image_url;
      let finalGallery = product.gallery;

      // B. Handle Cover Image
      // Cek apakah image_url masih path local (misal: /uploads/abc.png)
      if (product.image_url && !product.image_url.startsWith('http')) {
        const filename = path.basename(product.image_url); // ambil "abc.png"
        const localPath = path.join(__dirname, 'public', 'uploads', filename);
        
        if (fs.existsSync(localPath)) {
          console.log(`   ⬆️ Uploading cover ke Cloudinary...`);
          const uploadRes = await cloudinary.uploader.upload(localPath, {
            folder: 'luxspace-furniture',
            use_filename: true,
            unique_filename: false
          });
          finalImageUrl = uploadRes.secure_url;
        } else {
          console.log(`   ⚠️ File gambar tidak ditemukan: ${localPath}`);
        }
      }

      // C. Handle Gallery (Array Images)
      if (product.gallery) {
        let galleryArray = [];
        try {
          galleryArray = typeof product.gallery === 'string' ? JSON.parse(product.gallery) : product.gallery;
        } catch (e) { galleryArray = []; }

        const newGallery = [];
        for (const imgPath of galleryArray) {
          if (imgPath && !imgPath.startsWith('http')) {
            const filename = path.basename(imgPath);
            const localPath = path.join(__dirname, 'public', 'uploads', filename);
            
            if (fs.existsSync(localPath)) {
               // Upload gallery item
               const uploadRes = await cloudinary.uploader.upload(localPath, {
                 folder: 'luxspace-furniture'
               });
               newGallery.push(uploadRes.secure_url);
            }
          } else {
            newGallery.push(imgPath); // Kalau udah link, biarin aja
          }
        }
        finalGallery = JSON.stringify(newGallery);
      }

      // D. Insert ke Neon
      console.log(`   💾 Menyimpan ke Neon...`);
      await neonPool.query(
        `INSERT INTO products (name, category, price, stock, description, image_url, gallery) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          product.name, 
          product.category, 
          product.price, 
          product.stock, 
          product.description, 
          finalImageUrl, 
          finalGallery
        ]
      );
    }

    console.log('\n✅ Migrasi Produk Selesai!');
  } catch (err) {
    console.error('❌ Error Migrasi:', err);
  } finally {
    localPool.end();
    neonPool.end();
  }
}

// Jalankan Fungsi
migrateProducts();