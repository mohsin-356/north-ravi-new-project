interface Medicine {
  id: string;
  name: string;
  quantity: number;
  price: number;
  // Add other medicine properties as needed
}

export const updateInventoryOnReturn = (medicineName: string, quantity: number): void => {
  try {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const existingItemIndex = inventory.findIndex((item: any) => item.name === medicineName);

    if (existingItemIndex !== -1) {
      // Update existing item quantity
      inventory[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to inventory
      inventory.push({
        id: Date.now().toString(),
        name: medicineName,
        quantity: quantity,
        price: 0, // Default price, can be updated later
      });
    }

    localStorage.setItem('inventory', JSON.stringify(inventory));
    console.log(`Inventory updated: ${quantity} ${medicineName} added`);
  } catch (error) {
    console.error('Error updating inventory:', error);
  }
};

export const removeInventoryOnSupplierReturn = (medicineName: string, quantity: number): boolean => {
  try {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const existingItemIndex = inventory.findIndex((item: any) => item.name === medicineName);

    if (existingItemIndex !== -1) {
      const currentQuantity = parseInt(inventory[existingItemIndex].quantity);
      
      if (currentQuantity >= quantity) {
        // Update quantity
        inventory[existingItemIndex].quantity = currentQuantity - quantity;
        
        // Remove the item if quantity becomes zero
        if (inventory[existingItemIndex].quantity <= 0) {
          inventory.splice(existingItemIndex, 1);
        }
        
        localStorage.setItem('inventory', JSON.stringify(inventory));
        return true;
      } else {
        console.warn(`Not enough stock to return. Available: ${currentQuantity}, Requested: ${quantity}`);
        return false;
      }
    } else {
      console.warn(`Medicine ${medicineName} not found in inventory`);
      return false;
    }
  } catch (error) {
    console.error('Error updating inventory on supplier return:', error);
    return false;
  }
};
