import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Nool & Nila database seed...');

  // 1. Clean up existing records in reverse dependency order
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Admin User
  const adminSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', adminSalt);

  const admin = await prisma.user.create({
    data: {
      name: 'Nool & Nila Boutique Admin',
      email: 'admin@noolandnila.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      phone: '9876543210',
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // 3. Create Sample Customer User
  const customerSalt = await bcrypt.genSalt(10);
  const customerPasswordHash = await bcrypt.hash('Customer123!', customerSalt);

  const customer = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      phone: '9840123456',
      addresses: {
        create: {
          fullName: 'Priya Sharma',
          phone: '9840123456',
          streetAddress: '42, 3rd Avenue, Besant Nagar',
          landmark: 'Near Elliot’s Beach',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600090',
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });
  console.log(`✅ Sample customer created: ${customer.email}`);

  // 4. Create Categories
  const categories = [
    {
      name: 'Silk Sarees',
      slug: 'silk-sarees',
      description: 'Heirloom Kanjivaram, Banarasi, and pure mulberry silk handlooms woven with time-honored artistry.',
      imageUrl: '/images/sarees/kanjivaram-crimson-gold.jpg',
      displayOrder: 1,
    },
    {
      name: 'Cotton Sarees',
      slug: 'cotton-sarees',
      description: 'Light, breathable hand-spun Mulmul, Chanderi, and Maheshwari cottons tailored for daily grace.',
      imageUrl: '/images/sarees/mulmul-cotton-terracotta.jpg',
      displayOrder: 2,
    },
    {
      name: 'Wedding Sarees',
      slug: 'wedding-sarees',
      description: 'Grand bridal Kanjivarams and Banarasi brocades crafted for life’s most auspicious moments.',
      imageUrl: '/images/sarees/bridal-maroon-silk.jpg',
      displayOrder: 3,
    },
    {
      name: 'Festive Sarees',
      slug: 'festive-sarees',
      description: 'Radiant hues, rich temple borders, and celebratory zari motifs for festivities and pujas.',
      imageUrl: '/images/sarees/banarasi-emerald-green.jpg',
      displayOrder: 4,
    },
    {
      name: 'Everyday Sarees',
      slug: 'everyday-sarees',
      description: 'Effortless drape, gentle handloom textures, and soothing palettes for comfortable everyday elegance.',
      imageUrl: '/images/sarees/chanderi-coral-blush.jpg',
      displayOrder: 5,
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const created = await prisma.category.create({ data: cat });
    categoryMap.set(cat.slug, created.id);
  }
  console.log(`✅ Created ${categoryMap.size} categories`);

  // 5. Create Realistic Sarees
  const products = [
    {
      name: 'Rukmani Crimson Temple Kanjivaram Pure Silk Saree',
      slug: 'rukmani-crimson-temple-kanjivaram-pure-silk',
      sku: 'NN-KAN-01',
      shortDescription: 'Lustrous crimson Kanjivaram with pure gold zari korvai weave and traditional temple borders.',
      description:
        'Woven in the revered looms of Kanchipuram, this masterpiece features a saturated crimson red silk body framed by contrasting antique gold zari borders. The pallu showcases traditional peacock and yali motifs rendered in exquisite detail. Drapes with a majestic fall that stands out at weddings and traditional rituals.',
      fabric: 'Pure Kanjivaram Silk',
      weave: 'Korvai Handloom Weave',
      zariType: 'Tested Gold Zari',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Matching unstitched crimson silk blouse fabric (80cm) with zari sleeve border included.',
      washCare: 'Strictly dry clean only. Wrap in soft cotton muslin cloth and store away from moisture.',
      color: 'Crimson Maroon',
      colorHex: '#702C3B',
      occasion: 'Bridal & Wedding',
      pricePaise: 2450000, // ₹24,500
      mrpPaise: 2800000,
      stockQuantity: 4,
      isFeatured: true,
      isNewArrival: true,
      categorySlug: 'silk-sarees',
      image: '/images/sarees/kanjivaram-crimson-gold.jpg',
    },
    {
      name: 'Varanasi Emerald Jaal Banarasi Katan Silk Saree',
      slug: 'varanasi-emerald-jaal-banarasi-katan-silk',
      sku: 'NN-BAN-02',
      shortDescription: 'Regal emerald green Banarasi silk with all-over intricate antique gold zari floral jaal work.',
      description:
        'Crafted by master weavers in Varanasi, this heirloom saree features deep emerald green pure Katan silk enriched with delicate floral vine (jaal) motifs in antique gold zari. The scalloped border and opulent pallu exude old-world royal charm, making it a standout choice for receptions and grand celebrations.',
      fabric: 'Banarasi Katan Silk',
      weave: 'Kadwa Floral Jaal Weave',
      zariType: 'Antique Gold Zari',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Unstitched plain emerald silk blouse piece (80cm) with scalloped zari border.',
      washCare: 'Dry clean only. Air out periodically in shaded breeze. Do not spray perfume directly.',
      color: 'Emerald Green',
      colorHex: '#1B4D3E',
      occasion: 'Festive & Celebrations',
      pricePaise: 2200000, // ₹22,000
      mrpPaise: 2600000,
      stockQuantity: 3,
      isFeatured: true,
      isNewArrival: true,
      categorySlug: 'festive-sarees',
      image: '/images/sarees/banarasi-emerald-green.jpg',
    },
    {
      name: 'Malwa Sunset Coral Chanderi Handloom Saree',
      slug: 'malwa-sunset-coral-chanderi-handloom',
      sku: 'NN-CHA-03',
      shortDescription: 'Featherlight coral Chanderi silk-cotton handloom with gold micro-butis and tissue zari border.',
      description:
        'A celebration of Madhya Pradesh craftsmanship, this Chanderi saree balances sheer silk lightness with cotton comfort. Shimmering in warm sunset coral, it features hand-woven golden micro-butis across the body and a soft gold tissue border with delicate tassels.',
      fabric: 'Chanderi Silk-Cotton',
      weave: 'Fine Chanderi Handloom with Tissue Border',
      zariType: 'Muted Gold Micro-Butis',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Coordinating blush-coral running blouse piece (80cm) included.',
      washCare: 'Gentle dry clean or delicate hand wash with mild soap in cold water.',
      color: 'Sunset Coral',
      colorHex: '#E07A5F',
      occasion: 'Classic Workwear',
      pricePaise: 880000, // ₹8,800
      mrpPaise: 1050000,
      stockQuantity: 6,
      isFeatured: true,
      isNewArrival: false,
      categorySlug: 'everyday-sarees',
      image: '/images/sarees/chanderi-coral-blush.jpg',
    },
    {
      name: 'Neelambari Royal Indigo Handloom Silk Saree',
      slug: 'neelambari-royal-indigo-handloom-silk',
      sku: 'NN-IND-04',
      shortDescription: 'Deep royal indigo pure handloom silk accented with silver zari borders and magenta pallu.',
      description:
        'The drama of midnight indigo meets brilliant silver zari. This pure handloom silk saree presents an arresting contrast between its deep indigo body, intricate silver temple borders, and rich magenta-pink pallu. Lightweight yet commanding in its poise.',
      fabric: 'Pure Handloom Silk',
      weave: 'Interlocking Warp & Weft with Magenta Contrast Pallu',
      zariType: 'Antique Silver Zari',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Contrasting magenta silk blouse piece (85cm) with matching silver zari border.',
      washCare: 'Dry clean recommended. Iron on reverse side on low-medium heat.',
      color: 'Royal Indigo',
      colorHex: '#1F2A44',
      occasion: 'Festive & Celebrations',
      pricePaise: 1650000, // ₹16,500
      mrpPaise: 1900000,
      stockQuantity: 2,
      isFeatured: true,
      isNewArrival: true,
      categorySlug: 'silk-sarees',
      image: '/images/sarees/royal-indigo-silk.jpg',
    },
    {
      name: 'Swarna Mayil Ivory Pearl Kanjivaram Silk Saree',
      slug: 'swarna-mayil-ivory-pearl-kanjivaram-silk',
      sku: 'NN-IVO-05',
      shortDescription: 'Timeless ivory pearl pure silk saree woven with traditional peacock motifs in pure gold zari.',
      description:
        'An emblem of pure South Indian grace. Woven in unbleached ivory pearl silk, the saree features elaborate mayil (peacock) and rudraksha border motifs that gleam in pure gold zari. Perfect for temple ceremonies, muhurtham, and milestone family rituals.',
      fabric: 'Pure Kanjivaram Silk',
      weave: 'Traditional Korvai with Mayil (Peacock) Motifs',
      zariType: 'Pure Gold Zari',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Unstitched ivory silk blouse piece with full gold zari border (80cm).',
      washCare: 'Dry clean only. Preserve folds by changing crease lines every few months.',
      color: 'Ivory Pearl',
      colorHex: '#F7F1E7',
      occasion: 'Temple & Rituals',
      pricePaise: 2750000, // ₹27,500
      mrpPaise: 3100000,
      stockQuantity: 5,
      isFeatured: true,
      isNewArrival: false,
      categorySlug: 'silk-sarees',
      image: '/images/sarees/ivory-gold-kanjivaram.jpg',
    },
    {
      name: 'Ananya Terracotta Hand-Block Mulmul Cotton Saree',
      slug: 'ananya-terracotta-hand-block-mulmul-cotton',
      sku: 'NN-COT-06',
      shortDescription: 'Artisanal hand-block printed Mulmul cotton saree with earthy terracotta florals and zari selvedge.',
      description:
        'Lovingly crafted by generational block-printing artisans, this breathable Mulmul cotton saree feels like second skin. Featuring earthy terracotta and mustard vegetable-dye impressions with a fine zari selvedge, it blends artisanal heritage with effortless all-day comfort.',
      fabric: 'Fine Mulmul Cotton',
      weave: 'Hand-Block Printed Weave with Zari Tissue Selvedge',
      zariType: 'Fine Gold Border Line',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Matching hand-block printed cotton blouse fabric (80cm).',
      washCare: 'Hand wash separately in cold water with mild liquid detergent. Dry in shade.',
      color: 'Terracotta & Mustard',
      colorHex: '#C86446',
      occasion: 'Classic Workwear',
      pricePaise: 420000, // ₹4,200
      mrpPaise: 500000,
      stockQuantity: 8,
      isFeatured: false,
      isNewArrival: true,
      categorySlug: 'cotton-sarees',
      image: '/images/sarees/mulmul-cotton-terracotta.jpg',
    },
    {
      name: 'Padmavati Royal Maroon Bridal Heirloom Silk Saree',
      slug: 'padmavati-royal-maroon-bridal-heirloom-silk',
      sku: 'NN-BRI-07',
      shortDescription: 'Magnificent bridal Kanjivaram in deep maroon mulberry silk with grand elephant and floral pallu.',
      description:
        'Designed for the discerning bride who seeks the pinnacle of handloom luxury. Heavy weight mulberry silk in our signature brand maroon is married with dense pure gold zari craftsmanship. Features traditional elephant and temple medallion motifs across the grand pallu.',
      fabric: 'Pure Kanjivaram Silk',
      weave: 'Heavy Bridal Korvai with Elephant & Floral Medallions',
      zariType: 'Pure Antique Gold Zari',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Heavy brocade unstitched maroon blouse piece with rich zari back and sleeve motifs (1 meter).',
      washCare: 'Strictly dry clean only. Protect in muslin cloth. Heirloom preservation recommended.',
      color: 'Deep Maroon',
      colorHex: '#551F2C',
      occasion: 'Bridal & Wedding',
      pricePaise: 3800000, // ₹38,000
      mrpPaise: 4400000,
      stockQuantity: 2,
      isFeatured: true,
      isNewArrival: true,
      categorySlug: 'wedding-sarees',
      image: '/images/sarees/bridal-maroon-silk.jpg',
    },
    {
      name: 'Kalamkari Turmeric Mustard Wild Tussar Silk Saree',
      slug: 'kalamkari-turmeric-mustard-wild-tussar-silk',
      sku: 'NN-TUS-08',
      shortDescription: 'Textured wild Tussar silk in auspicious turmeric mustard with antique zari border and natural drape.',
      description:
        'Celebrated for its distinct natural texture and radiant sheen, this handloom wild Tussar silk saree glows in auspicious turmeric mustard. Accented with a sleek antique zari border, it offers a sophisticated statement for festive dinners, gallery openings, and cultural gatherings.',
      fabric: 'Handloom Tussar Silk',
      weave: 'Wild Ghicha Tussar Handloom',
      zariType: 'Subtle Antique Zari Border',
      lengthMeters: 5.5,
      blouseIncluded: true,
      blouseDetails: 'Unstitched textured tussar blouse piece (80cm) in matching mustard.',
      washCare: 'Dry clean only. Roll rather than press harsh creases to maintain textured weave.',
      color: 'Mustard Turmeric',
      colorHex: '#D49B28',
      occasion: 'Festive & Celebrations',
      pricePaise: 1150000, // ₹11,500
      mrpPaise: 1350000,
      stockQuantity: 3,
      isFeatured: false,
      isNewArrival: false,
      categorySlug: 'silk-sarees',
      image: '/images/sarees/mustard-tussar-silk.jpg',
    },
  ];

  const createdProducts: any[] = [];
  for (const p of products) {
    const categoryId = categoryMap.get(p.categorySlug)!;
    const { categorySlug, image, ...prodData } = p;

    const product = await prisma.product.create({
      data: {
        ...prodData,
        categoryId,
        images: {
          create: [
            {
              url: image,
              altText: prodData.name,
              displayOrder: 0,
            },
          ],
        },
      },
      include: { images: true },
    });

    createdProducts.push(product);

    // Initial inventory movement
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        quantityChange: product.stockQuantity,
        previousStock: 0,
        newStock: product.stockQuantity,
        reason: 'INITIAL_SEED_INVENTORY',
        createdByName: 'System Seed',
      },
    });
  }
  console.log(`✅ Seeded ${createdProducts.length} luxury sarees with full specifications and photos`);

  // 6. Create Initial Sample Order Request
  const sampleOrderSaree = createdProducts[0];
  const orderNumber = 'NN-2026-1048';
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber,
      userId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone!,
      shippingStreet: '42, 3rd Avenue, Besant Nagar',
      shippingLandmark: 'Near Elliot’s Beach',
      shippingCity: 'Chennai',
      shippingState: 'Tamil Nadu',
      shippingPostalCode: '600090',
      status: 'PENDING_CONFIRMATION',
      paymentStatus: 'NOT_APPLICABLE',
      subtotalPaise: sampleOrderSaree.pricePaise,
      shippingFeePaise: 0,
      discountPaise: 0,
      totalPaise: sampleOrderSaree.pricePaise,
      customerNotes: 'Please confirm saree fall and pico finishing before dispatch. Thank you!',
      items: {
        create: [
          {
            productId: sampleOrderSaree.id,
            productName: sampleOrderSaree.name,
            productSku: sampleOrderSaree.sku,
            fabric: sampleOrderSaree.fabric,
            color: sampleOrderSaree.color,
            imageUrl: sampleOrderSaree.images[0].url,
            pricePaise: sampleOrderSaree.pricePaise,
            quantity: 1,
            totalPaise: sampleOrderSaree.pricePaise,
          },
        ],
      },
      statusHistory: {
        create: [
          {
            status: 'PENDING_CONFIRMATION',
            notes: 'Order request submitted by customer. Boutique team reviewing loom inventory.',
            createdByName: customer.name,
          },
        ],
      },
    },
  });
  console.log(`✅ Created initial sample order request: ${sampleOrder.orderNumber}`);

  console.log('\n✨ Database seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Admin Credentials:');
  console.log('  Email:    admin@noolandnila.com');
  console.log('  Password: AdminPassword123!');
  console.log('\nCustomer Credentials:');
  console.log('  Email:    priya.sharma@example.com');
  console.log('  Password: Customer123!');
  console.log('----------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
