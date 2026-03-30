const body = {
  id: "ORD-TEST-123",
  customerInfo: {
    name: "Test User",
    phone: "01789456123",
    address: "Test Address",
    location: "inside",
    note: "Test Note"
  },
  items: [
    { product: { id: 1, name: "Test Product", price: 100 }, quantity: 1 }
  ],
  subtotal: 100,
  deliveryCharge: 80,
  grandTotal: 180,
  status: "Pending",
  paymentMethod: "Cash on Delivery"
};

fetch('http://localhost:5000/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
