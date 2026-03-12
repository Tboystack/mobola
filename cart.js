// Shopping Cart System
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Add item to cart
function addToCart(productName, price) {
  const quantity = prompt(`How many ${productName} would you like to add?`, '1');
  
  if (quantity === null) return; // User cancelled
  
  const qty = parseInt(quantity);
  
  if (isNaN(qty) || qty <= 0) {
    alert('Please enter a valid quantity');
    return;
  }
  
  // Check if product already exists in cart
  const existingItem = cart.find(item => item.name === productName);
  
  if (existingItem) {
    existingItem.quantity += qty;
  } else {
    cart.push({
      name: productName,
      price: price,
      quantity: qty
    });
  }
  
  // Save to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Update cart count and display
  updateCartCount();
  displayCartItems();
  
  alert(`${qty} ${productName}(s) added to cart!`);
}

// Update cart count in navigation
function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.getElementById('cart-count').textContent = count;
}

// Display cart items
function displayCartItems() {
  const container = document.getElementById('cart-items-container');
  
  if (cart.length === 0) {
    container.innerHTML = '<p id="empty-cart-message">Your cart is empty</p>';
    document.getElementById('cart-total').textContent = '0';
    return;
  }
  
  let html = '<table class="cart-table"><thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th>Action</th></tr></thead><tbody>';
  let grandTotal = 0;
  
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    grandTotal += itemTotal;
    
    html += `
      <tr>
        <td>${item.name}</td>
        <td>₦${item.price.toLocaleString()}</td>
        <td>
          <input type="number" min="1" value="${item.quantity}" 
            onchange="updateQuantity(${index}, this.value)" class="qty-input">
        </td>
        <td>₦${itemTotal.toLocaleString()}</td>
        <td>
          <button onclick="removeFromCart(${index})" class="remove-btn">Remove</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
  document.getElementById('cart-total').textContent = grandTotal.toLocaleString();
}

// Update quantity of an item
function updateQuantity(index, newQuantity) {
  const qty = parseInt(newQuantity);
  
  if (isNaN(qty) || qty <= 0) {
    alert('Please enter a valid quantity');
    displayCartItems();
    return;
  }
  
  cart[index].quantity = qty;
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  displayCartItems();
}

// Remove item from cart
function removeFromCart(index) {
  if (confirm('Remove this item from cart?')) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    displayCartItems();
  }
}

// Toggle cart modal
function toggleCart() {
  const modal = document.getElementById('cart-modal');
  
  if (modal.style.display === 'block') {
    modal.style.display = 'none';
  } else {
    modal.style.display = 'block';
    displayCartItems();
  }
}

// Close cart modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('cart-modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// Checkout function - redirect to WhatsApp with order details
function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  
  // Build order message
  let message = '';
  
  let grandTotal = 0;
  
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    grandTotal += itemTotal;
    
    message += `${item.name} - Qty: ${item.quantity} - ₦${itemTotal.toLocaleString()}\n`;
  });
  
  message += `\nTotal: ₦${grandTotal.toLocaleString()}`;
  
  // Encode message for WhatsApp URL
  const encodedMessage = encodeURIComponent(message);
  
  // WhatsApp URL with pre-filled message
  const whatsappURL = `https://wa.me/2348036795122?text=${encodedMessage}`;
  
  // Redirect to WhatsApp
  window.open(whatsappURL, '_blank');
  
  // Clear cart after checkout
  cart = [];
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  displayCartItems();
  toggleCart();
}

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', function() {
  updateCartCount();
});
