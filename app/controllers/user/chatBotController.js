const mongoose = require('mongoose');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Review = require('../../models/reviewModel');

const chatbotControls = async (req, res) => {
  const { message } = req.body;
  const lowerMsg = message.toLowerCase();
  let reply = "I'm sorry, I didn't understand that.";

  try {
    
    if (
      lowerMsg.includes('agent') ||
      lowerMsg.includes('support agent') ||
      lowerMsg.includes('live support') ||
      lowerMsg.includes('talk to someone') ||
      lowerMsg.includes('representative') ||
      lowerMsg.includes('human')
    ) {
      reply = "Connecting you to a live customer support agent. Please wait a moment while we transfer you.";
    }
    // Product category inquiries - Guitar specific
    else if (lowerMsg.includes('guitar')) {
      if (lowerMsg.includes('acoustic')) {
        // Query for acoustic guitars
        const acousticGuitars = await Product.find({
          product_name: { $regex: /acoustic/i },
          isActive: true
        }).sort({ price: 1 }).limit(3);

        if (acousticGuitars.length > 0) {
          const priceRange = `$${acousticGuitars[0].price} to $${acousticGuitars[acousticGuitars.length-1].price}`;
          reply = `Our acoustic guitars deliver a warm, rich tone and are great for beginners and pros alike. Popular models include ${acousticGuitars.map(g => g.product_name).join(', ')}. Prices range from ${priceRange}. Would you like more details on any specific model?`;
        } else {
          reply = "Our acoustic guitars deliver a warm, rich tone and are great for beginners and pros alike. Please check our website for the latest models and pricing.";
        }
      } else if (lowerMsg.includes('electric')) {
        // Query for electric guitars
        const electricGuitars = await Product.find({
          product_name: { $regex: /electric/i },
          isActive: true
        }).sort({ price: 1 }).limit(3);

        if (electricGuitars.length > 0) {
          const priceRange = `$${electricGuitars[0].price} to $${electricGuitars[electricGuitars.length-1].price}`;
          reply = `We have a wide selection of electric guitars perfect for rock, blues, and jazz. Popular models include ${electricGuitars.map(g => g.product_name).join(', ')}. Prices range from ${priceRange}. Do you need any specific brand or model?`;
        } else {
          reply = "We have a wide selection of electric guitars perfect for rock, blues, and jazz. Do you need any specific brand or model?";
        }
      } else if (lowerMsg.includes('beginner') || lowerMsg.includes('starter')) {
        reply = "For beginners, we recommend starting with an acoustic guitar like the Yamaha FG800 or an electric starter kit like the Squier Stratocaster Pack. Both come with everything you need to start your musical journey!";
      } else if (lowerMsg.includes('brand')) {
        reply = "We carry top guitar brands including Fender, Gibson, Martin, Taylor, Ibanez, PRS, and Yamaha. Do you have a preferred brand?";
      } else {
        // Get top-rated guitars
        const topGuitars = await Product.aggregate([
          {
            $match: {
              product_name: { $regex: /guitar/i },
              isActive: true
            }
          },
          {
            $lookup: {
              from: 'reviews',
              localField: '_id',
              foreignField: 'product',
              as: 'reviews'
            }
          },
          {
            $addFields: {
              avgRating: { $avg: '$reviews.rating' },
              reviewCount: { $size: '$reviews' }
            }
          },
          {
            $sort: { avgRating: -1, reviewCount: -1 }
          },
          {
            $limit: 3
          }
        ]);

        if (topGuitars.length > 0) {
          reply = `We offer a range of acoustic and electric guitars. Our top-rated models include ${topGuitars.map(g => g.product_name).join(', ')}. Which type are you interested in?`;
        } else {
          reply = "We offer a range of acoustic and electric guitars. Which type are you interested in?";
        }
      }
    } 
    // Product category inquiries - Ukulele
    else if (lowerMsg.includes('ukulele')) {
      const ukuleles = await Product.find({
        product_name: { $regex: /ukulele/i },
        isActive: true
      }).sort({ price: 1 }).limit(3);

      if (ukuleles.length > 0) {
        reply = `Our ukuleles are available in various sizes and designs, ideal for beginners and professionals. Popular models include ${ukuleles.map(u => u.product_name).join(', ')}. Would you like more information on ukulele sizes or brands?`;
      } else {
        reply = "Our ukuleles are available in various sizes (soprano, concert, tenor, and baritone) and designs, ideal for beginners and professionals.";
      }
      
      if (lowerMsg.includes('size') || lowerMsg.includes('type')) {
        reply = "Ukuleles come in four main sizes: soprano (the smallest and most common), concert (slightly larger with fuller sound), tenor (larger with deeper tone), and baritone (largest with guitar-like tuning). Which size interests you?";
      }
    } 
    // Accessories inquiries
    else if (lowerMsg.includes('accessory') || lowerMsg.includes('accessories')) {
      if (lowerMsg.includes('string')) {
        const strings = await Product.find({
          product_name: { $regex: /string/i },
          isActive: true
        }).limit(3);
        
        if (strings.length > 0) {
          reply = `We have high-quality guitar strings for different playing styles and instruments. Popular brands include ${strings.map(s => s.product_name.split(' ')[0]).join(', ')}. Prices start from $${Math.min(...strings.map(s => s.price))}.`;
        } else {
          reply = "We have high-quality guitar strings for different playing styles and instruments, including nylon, steel, and coated strings.";
        }
      } else if (lowerMsg.includes('pick') || lowerMsg.includes('plectrum')) {
        reply = "Our collection of picks includes options for different levels of grip and tone. We have thin picks (0.44-0.60mm) for strumming, medium picks (0.60-0.80mm) for versatility, and thick picks (0.80mm+) for more control and bass response.";
      } else if (lowerMsg.includes('strap')) {
        reply = "We offer durable and stylish straps that provide comfort and support. Our collection includes leather, nylon, and cotton straps with various designs and patterns.";
      } else if (lowerMsg.includes('capo')) {
        reply = "We carry several types of capos including trigger capos, spring capos, and partial capos for both acoustic and electric guitars.";
      } else if (lowerMsg.includes('tuner')) {
        reply = "We offer clip-on tuners, pedal tuners, and smartphone tuner apps. Clip-on tuners are the most popular for their convenience and accuracy.";
      } else if (lowerMsg.includes('amp') || lowerMsg.includes('amplifier')) {
        reply = "We have a range of amplifiers from practice amps to professional stage models. Brands include Fender, Marshall, Boss, and Line 6. Would you like recommendations based on your playing style?";
      } else {
        // Get accessories categories
        const accessories = await Category.find({
          name: { $regex: /accessor/i },
          isBlocked: false
        });
        
        if (accessories.length > 0) {
          reply = `We offer various accessories including strings, picks, straps, capos, tuners, stands, and more. Popular categories include ${accessories.map(a => a.name).join(', ')}. What accessory are you interested in?`;
        } else {
          reply = "We offer various accessories including strings, picks, straps, capos, tuners, stands, and more. What accessory are you interested in?";
        }
      }
    }
    // Top/Best product inquiries
    else if (lowerMsg.includes('best') || lowerMsg.includes('top') || lowerMsg.includes('popular')) {
      const topProducts = await Product.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'product',
            as: 'reviews'
          }
        },
        {
          $addFields: {
            avgRating: { $avg: '$reviews.rating' },
            reviewCount: { $size: '$reviews' }
          }
        },
        {
          $match: {
            reviewCount: { $gt: 0 }
          }
        },
        {
          $sort: { avgRating: -1, reviewCount: -1 }
        },
        {
          $limit: 3
        }
      ]);
      
      if (topProducts.length > 0) {
        reply = `Our top-rated products are ${topProducts.map(p => `${p.product_name} (${p.avgRating.toFixed(1)}/5 stars)`).join(', ')}. These are customer favorites with excellent reviews!`;
      } else {
        // Fallback to isTopModel flag
        const featuredProducts = await Product.find({ isTopModel: true, isActive: true }).limit(3);
        
        if (featuredProducts.length > 0) {
          reply = `Our most popular products include ${featuredProducts.map(p => p.product_name).join(', ')}. Would you like more details about any of these?`;
        } else {
          reply = "Our top products include the Taylor 214ce acoustic guitar, Fender Player Stratocaster electric guitar, and Kala KA-15S soprano ukulele. Would you like more information about any of these?";
        }
      }
    }
    // Price and offers inquiries
    else if (lowerMsg.includes('price') || lowerMsg.includes('cost')) {
      if (lowerMsg.includes('range')) {
        reply = "Our guitars range from $150 for beginner models to $3000+ for professional instruments. Ukuleles start at $50 and go up to $500 for premium models. Accessories are available at all price points.";
      } else if (lowerMsg.match(/under \$(\d+)/)) {
        const priceLimit = lowerMsg.match(/under \$(\d+)/)[1];
        const affordableProducts = await Product.find({
          price: { $lt: priceLimit },
          isActive: true
        }).sort({ price: -1 }).limit(3);
        
        if (affordableProducts.length > 0) {
          reply = `Products under $${priceLimit} include ${affordableProducts.map(p => `${p.product_name} ($${p.price})`).join(', ')}. Would you like more options in this price range?`;
        } else {
          reply = `I don't currently see products under $${priceLimit} in our database. Please visit our website for complete pricing or chat with a live agent for special orders.`;
        }
      } else {
        reply = "For pricing details, please check the product page or let me know which product you're interested in. We offer instruments across all price ranges from beginner to professional.";
      }
    } else if (lowerMsg.includes('discount') || lowerMsg.includes('offer') || lowerMsg.includes('sale') || lowerMsg.includes('deal')) {
      // Query products with offers
      const productsOnSale = await Product.find({
        offer: { $ne: null },
        isActive: true
      }).populate('offer').limit(3);
      
      if (productsOnSale.length > 0) {
        reply = `We currently have special offers on ${productsOnSale.map(p => p.product_name).join(', ')}. Visit our offers page for the latest deals!`;
      } else {
        reply = "We often have seasonal discounts and special offers. Visit our offers page for the latest deals! We also offer student discounts and bundle pricing on starter kits.";
      }
    }
    // Category inquiries
    else if (lowerMsg.includes('category') || lowerMsg.includes('categories') || lowerMsg.includes('types')) {
      const categories = await Category.find({ isBlocked: false });
      
      if (categories.length > 0) {
        reply = `Our main product categories include ${categories.map(c => c.name).join(', ')}. Which category would you like to explore?`;
      } else {
        reply = "Our main product categories include Electric Guitars, Acoustic Guitars, Bass Guitars, Ukuleles, Amplifiers, Effects & Pedals, and Accessories. Which category would you like to explore?";
      }
    }
    // Order and delivery inquiries
    else if (lowerMsg.includes('order')) {
      if (lowerMsg.includes('status') || lowerMsg.includes('track')) {
        reply = "You can track your order status from your account dashboard. Just log in, go to 'My Orders', and click on the specific order. Need help finding it?";
      } else if (lowerMsg.includes('cancel')) {
        reply = "Orders can be canceled within 24 hours of placement. After that, you'll need to process a return once you receive the item. Would you like me to connect you with a support agent to handle your cancellation?";
      } else if (lowerMsg.includes('change')) {
        reply = "Order modifications (shipping address, items, etc.) can only be made within 2 hours of placing the order. Please contact our support team immediately if you need to make changes.";
      } else {
        reply = "If you have questions about placing an order, please let me know how I can help. I can assist with order tracking, cancellations, or modifications.";
      }
    } else if (lowerMsg.includes('delivery') || lowerMsg.includes('shipping')) {
      if (lowerMsg.includes('time') || lowerMsg.includes('long')) {
        reply = "Standard shipping typically takes 3-5 business days within the continental US. Express shipping delivers in 1-2 business days. International shipping varies by location, usually 7-14 business days.";
      } else if (lowerMsg.includes('free')) {
        reply = "We offer free standard shipping on all orders over Rs.5000. Orders under Rs.1000 have a flat rate shipping fee of Rs.99";
      } else if (lowerMsg.includes('international')) {
        reply = "Yes, we ship internationally to most countries. International shipping costs depend on weight and destination. Delivery typically takes 7-14 business days, and import duties may apply.";
      } else {
        reply = "We offer standard shipping (3-5 business days, $7.95), express shipping (1-2 business days, $14.95), and free standard shipping on orders over $99. International shipping is also available.";
      }
    }
    // Return and warranty inquiries
    else if (lowerMsg.includes('return')) {
      if (lowerMsg.includes('policy')) {
        reply = "We have a 30-day return policy on most products. Items must be returned in original condition with all packaging. Custom or personalized items cannot be returned unless defective.";
      } else if (lowerMsg.includes('process') || lowerMsg.includes('how')) {
        reply = "To return an item, log into your account, go to 'My Orders', select the order, and click 'Return Item'. You'll receive a return label by email. Would you like more details?";
      } else if (lowerMsg.includes('refund')) {
        reply = "Refunds are processed within 5-7 business days after we receive your return. The amount will be credited back to your original payment method.";
      } else {
        reply = "We have a 30-day return policy on most products. Please check our returns page for detailed information. Would you like to know more about our return process?";
      }
    } else if (lowerMsg.includes('warranty')) {
      if (lowerMsg.includes('register')) {
        reply = "To register your product for warranty, please go to the 'Warranty Registration' section in your account and enter your product's serial number.";
      } else if (lowerMsg.includes('claim')) {
        reply = "To file a warranty claim, please contact our support team with your order number, product details, and a description of the issue, preferably with photos.";
      } else {
        reply = "Our products come with a warranty. Acoustic and electric guitars have a 2-year warranty, ukuleles have a 1-year warranty, and accessories typically have a 90-day warranty. Can you specify which item you are inquiring about?";
      }
    }
    // Customer support inquiries
    else if (lowerMsg.includes('support') || lowerMsg.includes('help')) {
      if (lowerMsg.includes('hours')) {
        reply = "Our customer support is available Monday through Friday, 9 AM to 8 PM ET, and Saturday from 10 AM to 6 PM ET. We're closed on Sundays and major holidays.";
      } else if (lowerMsg.includes('number') || lowerMsg.includes('phone')) {
        reply = "You can reach our support team by phone at (123) 456-7890 during our business hours.";
      } else {
        reply = "Our customer support team is available via phone, email, and live chat. You can contact them at support@guitman.com or call (123) 456-7890. Would you like to be connected to a live support agent?";
      }
    } else if (lowerMsg.includes('contact')) {
      reply = "You can reach our support team at support@guitman.com or call us at (123) 456-7890. Our business hours are Monday-Friday 9 AM to 8 PM ET and Saturday 10 AM to 6 PM ET.";
    }
    // Payment and financing inquiries
    else if (lowerMsg.includes('payment') || lowerMsg.includes('pay')) {
      if (lowerMsg.includes('method')) {
        reply = "We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, and Google Pay. We also offer financing options through Affirm.";
      } else if (lowerMsg.includes('installment') || lowerMsg.includes('finance') || lowerMsg.includes('affirm')) {
        reply = "Yes, we offer financing through Affirm on purchases over $200. This allows you to pay in monthly installments. You can select Affirm as your payment method during checkout.";
      } else {
        reply = "We accept various payment methods including credit cards, PayPal, and offer financing through Affirm. What specific payment information do you need?";
      }
    }
    // Lessons and learning inquiries
    else if (lowerMsg.includes('lesson') || lowerMsg.includes('tutorial') || lowerMsg.includes('learn')) {
      reply = "We offer free basic tutorials on our YouTube channel. For comprehensive learning, we partner with Fender Play and Guitar Tricks to offer discounted subscriptions. Would you like a link to our learning resources?";
    }
    // Store information inquiries
    else if (lowerMsg.includes('location') || lowerMsg.includes('store location') || lowerMsg.includes('physical store')) {
      reply = "We have physical stores in New York, Los Angeles, Chicago, and Nashville. Would you like the address of a specific location?";
    }
    // Gift inquiries
    else if (lowerMsg.includes('gift') || lowerMsg.includes('present')) {
      reply = "We offer gift cards in various denominations and can gift wrap any purchase for a small fee. For gift recommendations, our starter ukuleles and beginner acoustic guitars make excellent presents for music enthusiasts.";
    }
    // FAQs or general inquiries
    else if (lowerMsg.includes('recommend') || lowerMsg.includes('suggest')) {
      if (lowerMsg.includes('beginner')) {
        reply = "For beginners, we recommend the Yamaha FG800 acoustic guitar ($219.99) or the Squier Stratocaster Pack ($249.99) for electric. Both offer excellent quality at an affordable price point for new players.";
      } else if (lowerMsg.includes('professional') || lowerMsg.includes('advanced')) {
        reply = "For professional players, our top recommendations include the Taylor 814ce acoustic guitar and the Fender American Professional II Stratocaster. Both deliver exceptional tone, playability, and reliability for serious musicians.";
      } else {
        reply = "Based on your interests, we can recommend products once you let us know what style or features you're looking for. Are you shopping for a beginner, intermediate, or professional player?";
      }
    } else if (lowerMsg.includes('store') || lowerMsg.includes('shop') || lowerMsg.includes('about')) {
      reply = "GUITMAN offers a curated selection of guitars, ukuleles, and accessories. We've been serving musicians since 2005, with a commitment to quality instruments and exceptional customer service. Browse our collections to find the perfect instrument!";
    }
    // Technology inquiries
    else if (lowerMsg.includes('app') || lowerMsg.includes('mobile')) {
      reply = "Yes, we have a mobile app available for both iOS and Android. The app allows you to browse products, make purchases, track orders, and access exclusive mobile-only deals.";
    }
    // Fallback for unrecognized queries
    else {
      reply = "Our chatbot can help with product inquiries, order status, delivery information, and more. For questions outside these topics, please contact our support team or ask to speak with a live agent.";
    }

  } catch (error) {
    console.error('Chatbot error:', error);
    reply = "I'm having trouble retrieving that information right now. Would you like to speak with a customer service representative?";
  }
  
  res.json({ reply });
};

module.exports = chatbotControls;
