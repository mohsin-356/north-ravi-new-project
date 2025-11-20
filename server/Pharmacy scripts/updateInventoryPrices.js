const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const AddStock = require('../models/AddStock');
require('dotenv').config();

// Script to update inventory prices to show selling prices instead of buy prices
async function updateInventoryPrices() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmacy';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all inventory items
    const inventoryItems = await Inventory.find();
    console.log(`Found ${inventoryItems.length} inventory items`);

    let updatedCount = 0;

    for (const item of inventoryItems) {
      try {
        // Find the most recent approved AddStock for this medicine
        const recentAddStock = await AddStock.findOne({
          $or: [
            { medicine: item.medicine },
            { medicineName: item.name },
            { name: item.name }
          ],
          status: 'approved'
        }).sort({ date: -1 });

        if (recentAddStock && recentAddStock.unitSalePrice != null) {
          await Inventory.findByIdAndUpdate(item._id, {
            price: recentAddStock.unitSalePrice
          });
          console.log(`Updated ${item.name}: ${item.price} -> ${recentAddStock.unitSalePrice}`);
          updatedCount++;
        } else {
          console.log(`No approved AddStock with sell price found for ${item.name}, keeping current price: ${item.price}`);
        }
      } catch (error) {
        console.error(`Error updating ${item.name}:`, error.message);
      }
    }

    console.log(`Successfully updated ${updatedCount} inventory items with selling prices`);
    
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  updateInventoryPrices();
}

module.exports = updateInventoryPrices;
