import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, updateQty, removeItem, total, cartCount } = useCart();

const handleBack = () => navigate(-1);
  const handleCheckout = () => navigate("/addresspage");

  /* ================= EMPTY CART ================= */
  if (!cartItems || cartItems.length === 0) {
    return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-3 pb-6 max-w-5xl mx-auto w-full">

        {/* BACK (RIGHT) */}
        <div className="flex justify-start mb-6">
          <button
            className="text-xs text-orange-500 underline"
            onClick={handleBack}
          >
            ← Back
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            🛒
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-8">
            Add items to get started
          </p>
          <button
            onClick={handleBack}
            className="px-8 py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  /* ================= CART ================= */
  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-3 pb-6 max-w-5xl mx-auto w-full">

      {/* BACK (RIGHT) */}
      <div className="flex justify-start mb-6">
        <button
          className="text-xs text-orange-500 underline"
          onClick={handleBack}
        >
          ← Back
        </button>
      </div>

      {/* CART ITEMS */}
      <div className="flex-1 mb-8">
        {cartItems.map((item, index) => (
          <div
            key={`${item.id}-${item.selectedSize}-${index}`}
            className="flex items-center border-b border-gray-200 py-4"
          >
            {/* IMAGE */}
            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden mr-4">
              <img
                src={item.image || "/placeholder.jpg"}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* PRODUCT INFO */}
            <div className="flex-1 pr-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {item.name}
              </h3>

              <p className="text-xs text-gray-500 mb-2">
                ₹ {item.price}
              </p>

              <div className="flex items-center gap-3">
                {item.selectedSize && (
                  <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    Size: {item.selectedSize}
                  </span>
                )}

                <button
                  onClick={() =>
                    removeItem(item.id, item.selectedSize)
                  }
                  className="text-xs text-red-500 underline"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* QTY */}
            <div className="flex items-center gap-2 mr-6">
              <button
                onClick={() =>
                  updateQty(item.id, item.qty - 1, item.selectedSize)
                }
                disabled={item.qty <= 1}
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center"
              >
                -
              </button>

              <span className="text-sm font-bold w-6 text-center">
                {item.qty}
              </span>

              <button
                onClick={() =>
                  updateQty(item.id, item.qty + 1, item.selectedSize)
                }
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center"
              >
                +
              </button>
            </div>

            {/* PRICE */}
            <div className="font-bold text-sm text-gray-900 min-w-[70px] text-right">
              ₹ {(item.price * item.qty).toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex justify-between mb-6">
          <span className="text-sm font-semibold">
            Total ({cartCount} items)
          </span>
          <span className="text-lg font-bold">
            ₹ {total.toLocaleString("en-IN")}
          </span>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full max-w-sm mx-auto block px-10 py-3 bg-orange-500 text-white rounded-full font-bold hover:bg-orange-600"
        >
          Proceed to Pay
        </button>
      </div>
    </div>
  );
};

export default CartPage;
