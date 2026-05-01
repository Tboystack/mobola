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

// Checkout function - create order through API
async function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  
  try {
    // Check if user is authenticated
    const authResponse = await fetch('/api/auth/me');
    const authData = await authResponse.json();
    
    if (!authData.authenticated) {
      alert('Please login to checkout. Redirecting to login page...');
      window.location.href = '/HTML/login.html';
      return;
    }
    
    // Get delivery details from user
    const customerName = prompt('Enter your full name:');
    if (!customerName) return;
    
    const customerPhone = prompt('Enter your phone number:');
    if (!customerPhone) return;
    
    const deliveryAddress = prompt('Enter your delivery address:');
    if (!deliveryAddress) return;
    
    const notes = prompt('Any special instructions? (Optional)');
    
    // Calculate total
    let totalAmount = 0;
    cart.forEach(item => {
      totalAmount += item.price * item.quantity;
    });
    
    // Create order
    const orderResponse = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: cart,
        totalAmount: totalAmount,
        customerName: customerName,
        customerEmail: authData.email,
        customerPhone: customerPhone,
        deliveryAddress: deliveryAddress,
        notes: notes
      })
    });
    
    const orderData = await orderResponse.json();
    
    if (orderResponse.ok) {
      alert(`Order created successfully!\nOrder Number: ${orderData.orderNumber}\n\nYou will receive an email confirmation shortly.`);
      
      // Clear cart
      cart = [];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      displayCartItems();
      toggleCart();
      
      // Redirect to account page
      setTimeout(() => {
        window.location.href = '/HTML/account.html';
      }, 2000);
    } else {
      alert('Error creating order: ' + (orderData.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('An error occurred during checkout. Please try again.');
  }
}

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', function() {
  updateCartCount();
});
