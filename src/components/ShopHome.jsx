import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

/* 🔥 FIREBASE ADDITION */
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
/* 🔥 END */

const categories = [
  { id: 1, title: "karate wear", image: "/Adidas karate.jpg", category: "karate-uniform" },
  { id: 2, title: "Upper Wear", image: "/upperwear.jpg", category: "upper-wear" },
  { id: 3, title: "Bottom Wear", image: "/bottomwear.jpg", category: "bottom-wear" },
  { id: 4, title: "GYM", image: "/gym.jpg", category: "gym" },
  { id: 5, title: "Head wear", image: "/headwear.jpg", category: "head-wear" },
  { id: 6, title: "Sports Equipment", image: "/sportsequipment.jpg", category: "sports-equipment" },
];

const recommended = [
  {
    id: 1,
    name: "Shoes",
    price: 30000,
    images: [
      "https://images.pexels.com/photos/2529147/pexels-photo-2529147.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800",
      "https://images.pexels.com/photos/19090/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800",
    ],
    colors: ["#e98f97ff", "#80888fff", "#2146cbff"],
  },
  {
    id: 2,
    name: "T-Shirt",
    price: 30000,
    images: ["/tshirt-1.jpg", "/tshirt-2.jpg", "/tshirt-3.jpg"],
    colors: ["#6d909bff", "#111827", "#051c5dff"],
  },
  {
    id: 3,
    name: "Head wear",
    price: 30000,
    images: ["/headwear-1.jpg", "/headwear-2.jpg", "/headwear-3.jpg"],
    colors: ["#F97316", "#111827", "#E5E7EB"],
  },
];

const ShopHome = () => {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();

  /* 🔥 FIREBASE ADDITION (kept, not removed) */
  const [firebaseProducts, setFirebaseProducts] = useState([]);
  /* 🔥 END */

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("shopProducts")) || [];
    console.log("Shop Products (local):", stored);
  }, []);

  /* 🔥 FIREBASE ADDITION (kept for verification/logs) */
  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFirebaseProducts(list);
      console.log("Shop Products (Firebase):", list);
    };

    fetchProducts();
  }, []);
  /* 🔥 END */

  const handleViewCart = () => navigate("/cart");
  const handleOpenWishlist = () => navigate("/wishlist");

  /* ✅ FIXED: CATEGORY-WISE NAVIGATION */
  const handleCategoryClick = (categoryId) => {
    navigate(`/shop/products?category=${categoryId}`);
  };

  const handleOpenGrid = () => {
    return;
  };

  const catRowRef = useRef(null);
  const firstCardRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(220);

  useEffect(() => {
    if (firstCardRef.current) {
      const rect = firstCardRef.current.getBoundingClientRect();
      setCardWidth(rect.width + 16);
    }
  }, []);

  const scrollCategories = (direction) => {
    if (!catRowRef.current) return;
    const offset = direction === "left" ? -cardWidth : cardWidth;
    catRowRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* hero */}
      <div className="relative">
        <div className="w-full h-[260px] sm:h-[340px] md:h-[420px] lg:h-[480px] overflow-hidden">
          <img src="/shop.jpg" alt="Store" className="w-full h-full object-cover" />
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-3">
          <button
            onClick={handleOpenWishlist}
            className="relative w-12 h-12 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center text-orange-500 text-xl"
          >
            ♥
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            onClick={handleViewCart}
            className="relative w-12 h-12 rounded-2xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center text-orange-500 text-2xl"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* categories */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="flex items-center gap-2">
          <button onClick={() => scrollCategories("left")} className="hidden sm:flex w-8 h-8 rounded-full bg-gray-100">
            ‹
          </button>

          <div ref={catRowRef} className="flex gap-4 overflow-x-auto no-scrollbar w-full">
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                ref={idx === 0 ? firstCardRef : null}
                onClick={() => handleCategoryClick(cat.category)}
                className="relative h-20 w-52 md:h-24 md:w-56 rounded-xl overflow-hidden shadow-md bg-black flex-shrink-0 group cursor-pointer"
              >
                <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-lg group-hover:text-orange-400">
                  {cat.title}
                </span>
              </button>
            ))}
          </div>

          <button onClick={() => scrollCategories("right")} className="hidden sm:flex w-8 h-8 rounded-full bg-gray-100">
            ›
          </button>
        </div>
      </section>

      {/* Recommended */}
      <section className="max-w-6xl mx-auto px-4 mt-10 mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-orange-500 mb-6">
          Recommended
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommended.map((item) => (
            <RecommendedCard key={item.id} item={item} onOpenGrid={handleOpenGrid} />
          ))}
        </div>
      </section>
    </div>
  );
};

const RecommendedCard = ({ item, onOpenGrid }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % item.images.length), 2000);
    return () => clearInterval(timer);
  }, [item.images.length]);

  const slideWidth = 100 / item.images.length;

  return (
    <div className="bg-white rounded-[32px] shadow-md border border-gray-100 overflow-hidden flex flex-col">
      <div className="px-6 pt-6 pb-4">
        <div className="bg-gray-50 rounded-[32px] overflow-hidden relative h-64">
          <div
            className="absolute inset-0 flex"
            style={{
              width: `${item.images.length * 100}%`,
              transform: `translateX(-${index * slideWidth}%)`,
              transition: "transform 0.4s ease",
            }}
          >
            {item.images.map((src, i) => (
              <img key={i} src={src} alt={item.name} className="h-64 object-cover flex-shrink-0" style={{ width: `${slideWidth}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopHome;
