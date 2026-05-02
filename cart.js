// Shopping Cart System
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Add item to cart - requires authentication
async function addToCart(productName, price) {
  try {
    // Check if user is authenticated
    const authResponse = await fetch('/api/auth/me');
    const authData = await authResponse.json();
    
    if (!authData.authenticated) {
      alert('Please login to add items to cart. Redirecting to login page...');
      window.location.href = '/HTML/login.html';
      return;
    }
    
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
  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('An error occurred. Please try again.');
  }
}

// Update cart count in navigation
function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = count;
  }
}

// Display cart items
function displayCartItems() {
  const container = document.getElementById('cart-items-container');
  const loginPrompt = document.getElementById('login-prompt');
  
  if (cart.length === 0) {
    if (loginPrompt) loginPrompt.style.display = 'none';
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Your cart is empty</p>';
    document.getElementById('cart-total').textContent = '0';
    return;
  }
  
  if (loginPrompt) loginPrompt.style.display = 'none';
  
  let html = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
  `;
  let grandTotal = 0;
  
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    grandTotal += itemTotal;
    
    html += `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₦${item.price.toLocaleString()}</div>
          <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; align-items: center;">
            <input type="number" min="1" value="${item.quantity}" 
              onchange="updateQuantity(${index}, this.value)" style="width: 60px; padding: 0.3rem; border: 1px solid #ddd; border-radius: 4px;">
            <span style="color: #667eea; font-weight: 600;">Qty: ${item.quantity}</span>
            <button onclick="removeFromCart(${index})" style="background: #ff6b6b; color: white; border: none; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Remove</button>
          </div>
        </div>
        <div style="text-align: right; font-weight: bold; color: #667eea;">
          ₦${itemTotal.toLocaleString()}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
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
async function toggleCart() {
  try {
    // Check if user is authenticated
    const authResponse = await fetch('/api/auth/me');
    const authData = await authResponse.json();
    
    const modal = document.getElementById('cart-modal');
    const loginPrompt = document.getElementById('login-prompt');
    
    if (modal.style.display === 'block') {
      modal.style.display = 'none';
    } else {
      modal.style.display = 'block';
      
      if (!authData.authenticated) {
        if (loginPrompt) {
          loginPrompt.style.display = 'block';
        }
        document.getElementById('cart-items-container').innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Please login to view your cart</p>';
      } else {
        if (loginPrompt) {
          loginPrompt.style.display = 'none';
        }
        displayCartItems();
      }
    }
  } catch (error) {
    console.error('Error toggling cart:', error);
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
      
      // Close cart modal
      const modal = document.getElementById('cart-modal');
      modal.style.display = 'none';
      
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
