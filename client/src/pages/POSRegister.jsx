import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  CircleDollarSign, 
  User, 
  UserPlus, 
  Check, 
  ShoppingCart, 
  AlertCircle,
  X,
  PackageX
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import ReceiptModal from '../components/ReceiptModal';

export default function POSRegister() {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tenderAmount, setTenderAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Customer quick modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  // Completed sale receipt modal
  const [completedSale, setCompletedSale] = useState(null);

  // Load initial catalog data
  const loadCatalog = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, custRes] = await Promise.all([
        api.getProducts({ limit: 100 }),
        api.getCategories(),
        api.getCustomers({ limit: 100 }),
      ]);
      setProducts(prodRes?.data || []);
      setCategories(catRes?.data || []);
      setCustomers(custRes?.data || []);
    } catch (err) {
      toast.error('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = !selectedCategory || p.category_id === selectedCategory;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = Math.min(Number(discount) || 0, subtotal);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = Number((taxableAmount * 0.05).toFixed(2));
  const grandTotal = Number((taxableAmount + tax).toFixed(2));

  // Cart actions
  const addToCart = (product) => {
    if (product.stock_qty <= 0) {
      toast.error(`"${product.name}" is out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) {
          toast.info(`Cannot add more than ${product.stock_qty} in stock`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          stock_qty: product.stock_qty,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock_qty) {
              toast.info(`Max stock available is ${item.stock_qty}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomer(null);
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    try {
      const res = await api.createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
      });
      const created = res.data;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created);
      setShowNewCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      toast.success(`Customer "${created.name}" created`);
    } catch (err) {
      toast.error(err.message || 'Failed to create customer');
    }
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      toast.info('Cart is empty');
      return;
    }
    setTenderAmount(grandTotal.toString());
    setPaymentMethod('cash');
    setShowCheckout(true);
  };

  // Change computation
  const tenderNum = parseFloat(tenderAmount) || 0;
  const changeDue = Math.max(0, tenderNum - grandTotal);
  const isTenderValid = paymentMethod !== 'cash' || tenderNum >= grandTotal;

  // Process Checkout
  const handleCompleteSale = async () => {
    if (!isTenderValid) {
      toast.error('Tender amount is less than total due');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        discount: discountAmount,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'cash' ? tenderNum : grandTotal,
      };

      const res = await api.createSale(payload);
      toast.success(`Sale #${res.data.sale_number} completed!`);

      // Show receipt modal
      setCompletedSale(res.data);
      setShowCheckout(false);
      clearCart();

      // Refresh product list stock
      loadCatalog();
    } catch (err) {
      toast.error(err.message || 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* LEFT: Product Catalog & Category Filter */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100/70 border-r border-slate-200">
        {/* Search & Category Header */}
        <div className="p-4 bg-white border-b border-slate-200 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                selectedCategory === null
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({cat.product_count})
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Loading catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <PackageX className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_qty <= 0;
                const isLowStock = p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold;
                const cartQty = cart.find((i) => i.product_id === p.id)?.quantity || 0;

                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`relative p-3.5 rounded-2xl bg-white border text-left flex flex-col justify-between transition group shadow-xs hover:shadow-md cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                        : cartQty > 0
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-slate-200/80 hover:border-indigo-300'
                    }`}
                  >
                    {cartQty > 0 && (
                      <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md animate-in zoom-in">
                        {cartQty}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-mono">{p.sku}</span>
                        {p.category_name && (
                          <span className="truncate max-w-[80px] text-slate-500">
                            {p.category_name}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-800 text-sm line-clamp-2 leading-snug group-hover:text-indigo-600 transition">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">
                        ${Number(p.price).toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-700'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isOutOfStock ? 'Out' : `${p.stock_qty} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout Panel */}
      <div className="w-96 bg-white flex flex-col shadow-lg shrink-0">
        {/* Customer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Customer
            </span>
            <button
              onClick={() => setShowNewCustomerModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              New
            </button>
          </div>

          <div className="relative">
            <select
              value={selectedCustomer ? selectedCustomer.id : ''}
              onChange={(e) => {
                const id = parseInt(e.target.value);
                setSelectedCustomer(customers.find((c) => c.id === id) || null);
              }}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Walk-in Customer (Guest)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p className="font-medium">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Tap items on the left to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">{item.name}</h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ${Number(item.price).toFixed(2)} each
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(item.product_id, -1)}
                    className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs shadow-xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product_id, 1)}
                    className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="w-16 text-right font-bold text-xs text-slate-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>

                <button
                  onClick={() => removeFromCart(item.product_id)}
                  className="text-slate-300 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                Discount ($):
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                max={subtotal}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 text-right py-1 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
              />
            </div>

            <div className="flex justify-between">
              <span>Tax (5%):</span>
              <span className="font-semibold">${tax.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
              <span>Total:</span>
              <span className="text-indigo-600">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="py-3 px-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Clear
            </button>
            <button
              onClick={handleOpenCheckout}
              disabled={cart.length === 0}
              className="col-span-3 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Pay ${grandTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Checkout</h3>
                <p className="text-xs text-slate-500">
                  {cart.length} item{cart.length > 1 ? 's' : ''} • Total ${grandTotal.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'other', label: 'UPI / Other', icon: CircleDollarSign },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMethod(m.id);
                      if (m.id !== 'cash') setTenderAmount(grandTotal.toString());
                    }}
                    className={`py-3 px-2 rounded-2xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Tender Details */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center text-xs font-medium text-slate-600">
                  <span>Tender Amount:</span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min={grandTotal}
                      value={tenderAmount}
                      onChange={(e) => setTenderAmount(e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-right font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick denomination buttons */}
                <div className="flex gap-1.5">
                  {[
                    { label: 'Exact', val: grandTotal },
                    { label: `$${Math.ceil(grandTotal)}`, val: Math.ceil(grandTotal) },
                    { label: '$20', val: 20 },
                    { label: '$50', val: 50 },
                    { label: '$100', val: 100 },
                  ]
                    .filter((btn, i, arr) => i === 0 || btn.val >= grandTotal)
                    .slice(0, 5)
                    .map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTenderAmount(b.val.toString())}
                        className="flex-1 py-1 px-1 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                      >
                        {b.label}
                      </button>
                    ))}
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700">Change Due:</span>
                  <span className={`text-base font-bold ${changeDue > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    ${changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleCompleteSale}
              disabled={submitting || !isTenderValid}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl text-base shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Complete & Print Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* QUICK NEW CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Add Customer</h3>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="e.g. 555-0199"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-xs hover:bg-indigo-700"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <ReceiptModal
        sale={completedSale}
        onClose={() => setCompletedSale(null)}
      />
    </div>
  );
}
