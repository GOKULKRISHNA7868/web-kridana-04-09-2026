import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import FullProductPage from "./FullProductPage";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

/* CATEGORY MASTER */
const CATEGORIES = [
  { id: "karate-wear", label: "Karate Uniform" },
  { id: "upper-wear", label: "Upper Wear" },
  { id: "bottom-wear", label: "Bottom Wear" },
  { id: "gym", label: "Gym" },
  { id: "head-wear", label: "Head Wear" },
  { id: "sports-equipment", label: "Sports Equipment" },
];

const CATEGORY_ALIAS_MAP = {
  "karate-uniform": "karate-wear",
};

const normalizeCategory = (value) => {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/\s+/g, "-");
  return CATEGORY_ALIAS_MAP[normalized] || normalized;
};

const ProductsGridPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, cartCount } = useCart();
  const { wishlistItems } = useWishlist();

  const [products, setProducts] = useState([]);
  const [view, setView] = useState("grid");
  const [selectedProduct, setSelectedProduct] = useState(null);

  /* FILTER STATES */
  const [priceRanges, setPriceRanges] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams(location.search);
  const rawCategory = params.get("category");
  const categoryFromURL = normalizeCategory(rawCategory);

  /* ================= FETCH PRODUCTS ================= */
  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ SHOW ALL PRODUCTS FROM FIREBASE (NO FILTERING HERE)
      setProducts(list);
    };

    fetchProducts();
  }, []);

  /* ================= FILTER LOGIC ================= */
  const filteredProducts = products.filter((p) => {
    // CATEGORY
    if (
      categoryFromURL &&
      normalizeCategory(p.productCategory) !== categoryFromURL
    ) {
      return false;
    }

    // SEARCH
    if (searchText.trim()) {
      const text = searchText.toLowerCase();
      const nameMatch = p.productName?.toLowerCase().includes(text);
      const brandMatch = p.brandName?.toLowerCase().includes(text);
      if (!nameMatch && !brandMatch) return false;
    }

    // PRICE
    if (priceRanges.length > 0) {
      const priceMatch = priceRanges.some(
        ([min, max]) => p.productPrice >= min && p.productPrice <= max
      );
      if (!priceMatch) return false;
    }

    // COLOR
    if (selectedColors.length > 0) {
      const productColors =
        p.productColors
          ?.split(",")
          .map((c) => c.trim().toLowerCase()) || [];

      const colorMatch = selectedColors.some((c) =>
        productColors.includes(c)
      );
      if (!colorMatch) return false;
    }

    return true;
  });

  /* ================= FULL PRODUCT ================= */
  const openFullProduct = (product) => {
    setSelectedProduct(product);
    setView("full");
  };

  if (view === "full" && selectedProduct) {
    return (
      <FullProductPage
        product={selectedProduct}
        onBack={() => setView("grid")}
       onAddToCart={(product, selectedSize) => {
  addToCart(product, selectedSize);
}}

        cartCount={cartCount}
        onViewCart={() => navigate("/cart")}
      />
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="hidden md:block w-72 shrink-0 bg-orange-100 text-gray-900 p-5">
        <h2 className="text-orange-600 text-xl font-bold mb-4">
          Category
        </h2>

        {CATEGORIES.map((cat) => (
          <div
            key={cat.id}
            onClick={() =>
              navigate(`/shop/products?category=${cat.id}`)
            }
            className={`py-3 border-b border-orange-600 cursor-pointer ${
              categoryFromURL === cat.id
                ? "text-orange-400 font-bold"
                : ""
            }`}
          >
            {cat.label}
          </div>
        ))}

        <h3 className="text-orange-600 text-lg font-bold mt-8 mb-3">
          Filter By :
        </h3>

        {[
          [100, 1000],
          [1000, 5000],
          [5000, 10000],
        ].map((range) => (
          <label
            key={range.join("-")}
            className="flex items-center gap-3 mb-3 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={priceRanges.some(
                (r) => r[0] === range[0] && r[1] === range[1]
              )}
              onChange={(e) => {
                setPriceRanges((prev) =>
                  e.target.checked
                    ? [...prev, range]
                    : prev.filter(
                        (r) =>
                          r[0] !== range[0] || r[1] !== range[1]
                      )
                );
              }}
            />
            ₹ {range[0]} – {range[1]}
          </label>
        ))}

        <h3 className="text-orange-600 text-lg font-bold mt-8 mb-3">
          Colors
        </h3>

        <div className="flex gap-2 flex-wrap">
          {["black", "orange", "red", "green", "blue", "purple", "white"].map(
            (color) => (
              <div
                key={color}
                onClick={() =>
                  setSelectedColors((prev) =>
                    prev.includes(color)
                      ? prev.filter((c) => c !== color)
                      : [...prev, color]
                  )
                }
                className={`w-6 h-6 rounded border cursor-pointer ${
                  selectedColors.includes(color)
                    ? "ring-2 ring-yellow-400"
                    : ""
                }`}
                style={{ backgroundColor: color }}
              />
            )
          )}
        </div>
      </aside>

      <div className="md:hidden px-4 pt-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => navigate(`/shop/products?category=${cat.id}`)}
            className={`shrink-0 px-3 py-2 rounded-full text-xs font-semibold border ${
              categoryFromURL === cat.id
                ? "bg-[#FF6A00] text-white border-[#FF6A00]"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* PRODUCTS */}
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {/* TOP BAR */}
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/shop")}
            className="text-sm font-semibold text-orange-600 hover:underline self-start"
          >
            ← Back
          </button>

          <div className="w-full sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:max-w-xl">
            <div className="relative w-full h-12">
              <span className="absolute left-5 inset-y-0 flex items-center text-orange-400 text-lg">
                🔍
              </span>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search products..."
                className="h-12 w-full pl-12 pr-6 text-base rounded-full
                           border border-orange-400
                           focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
          </div>
        </div>

          <div className="sm:ml-auto flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => navigate("/wishlist")}
              className="relative w-12 h-12 rounded-full bg-orange-50 border-2 border-orange-200 
                         flex items-center justify-center text-orange-500 text-xl"
            >
              ♥
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                                 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {wishlistItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate("/cart")}
              className="relative w-12 h-12 rounded-full bg-orange-50 border-2 border-orange-200 
                         flex items-center justify-center text-orange-500 text-xl"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                                 rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => openFullProduct(product)}
              className="bg-white shadow rounded-xl cursor-pointer"
            >
              <div className="h-44 bg-gray-100 overflow-hidden rounded-t-xl">
                <img
                  src={product.productImages?.[0] || "/placeholder.jpg"}
                  alt={product.productName}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-4">
                <h3 className="font-semibold">
                  {product.productName}
                </h3>
                <p className="text-orange-500 font-bold">
                  ₹ {product.productPrice}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ProductsGridPage;
