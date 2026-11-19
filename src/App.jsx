import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  MessageCircle, 
  Search, 
  Plus, 
  Minus, 
  X, 
  ShoppingBag, 
  MapPin, 
  ArrowUp,
  Check,
  ChevronDown
} from 'lucide-react';
import { MENU_DATA, WHATSAPP_NUMBER, PHONE_NUMBER } from './menuData';
import logoImg from './assets/logo.jpg';

// ─── Custom Brush Stroke SVG Accent ───
const BrushAccent = ({ color = '#F5A623', width = 120, height = 8 }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 120 8" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block mt-1"
  >
    <path 
      d="M2 5.5C25 2.5 65 1.5 118 4.5C95 6.8 45 7.2 2 5.5Z" 
      fill={color} 
      fillOpacity="0.85"
    />
  </svg>
);

// ─── Arabic Text Normalization Helper ───
export function normalizeArabic(text) {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export default function App() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('ageba_cart_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  // Modal State
  const [customizingItem, setCustomizingItem] = useState(null);
  const [customizingSection, setCustomizingSection] = useState(null);
  const [modalSize, setModalSize] = useState('S');
  const [modalAddons, setModalAddons] = useState(new Set());
  const [modalQty, setModalQty] = useState(1);

  // Cart Drawer State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Scroll tracking
  const [showScrollTop, setShowScrollTop] = useState(false);
  const itemsContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ageba_cart_v2', JSON.stringify(cart));
    } catch (e) {
      console.error('Storage error', e);
    }
  }, [cart]);

  // Working Hours (10:00 AM to 5:00 AM)
  useEffect(() => {
    const checkHours = () => {
      const now = new Date();
      const currentH = now.getHours() + now.getMinutes() / 60;
      const normalizedH = currentH < 10 ? currentH + 24 : currentH;
      setIsStoreOpen(normalizedH >= 10 && normalizedH < 29);
    };
    checkHours();
    const interval = setInterval(checkHours, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── SMART GLOBAL SEARCH & FILTERING ───
  const isSearching = searchQuery.trim().length > 0;
  const normalizedQuery = useMemo(() => normalizeArabic(searchQuery), [searchQuery]);

  const { filteredSections, totalSearchResults } = useMemo(() => {
    let count = 0;

    const sections = MENU_DATA.map(section => {
      if (!isSearching && activeCategory !== 'all' && activeCategory !== section.id) {
        return null;
      }

      let items = section.items;

      if (isSearching) {
        const normalizedSectionTitle = normalizeArabic(section.title);
        const sectionMatchesQuery = normalizedSectionTitle.includes(normalizedQuery);

        items = items.filter(item => {
          if (normalizeArabic(item.name).includes(normalizedQuery)) return true;
          if (item.desc && normalizeArabic(item.desc).includes(normalizedQuery)) return true;
          if (item.tag && normalizeArabic(item.tag).includes(normalizedQuery)) return true;
          if (sectionMatchesQuery) return true;
          return false;
        });
      }

      if (items.length === 0) return null;
      count += items.length;

      return {
        ...section,
        items
      };
    }).filter(Boolean);

    return { filteredSections: sections, totalSearchResults: count };
  }, [activeCategory, isSearching, normalizedQuery]);

  // Totals
  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const totalCartPrice = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);

  // Quick Add or Open Modal
  const handleItemSelect = (item, section) => {
    if (section.hasSizes || (section.addons && section.addons.length > 0)) {
      setCustomizingItem(item);
      setCustomizingSection(section);
      setModalSize(section.hasSizes ? 'S' : null);
      setModalAddons(new Set());
      setModalQty(1);
    } else {
      const cartItem = {
        cartId: Date.now() + Math.random(),
        id: item.id,
        name: item.name,
        sectionId: section.id,
        size: null,
        addons: [],
        unitPrice: item.price,
        qty: 1,
        lineTotal: item.price
      };
      setCart(prev => [...prev, cartItem]);
    }
  };

  // Add from Customization Sheet
  const confirmCustomization = () => {
    if (!customizingItem) return;
    const basePrice = customizingSection.hasSizes
      ? (modalSize === 'L' ? customizingItem.priceL : customizingItem.priceS)
      : customizingItem.price;

    const addonsArr = Array.from(modalAddons).map(k => {
      const [id, name, price] = k.split('|');
      return { id, name, price: parseInt(price, 10) };
    });
    const addonsTotal = addonsArr.reduce((s, a) => s + a.price, 0);
    const unitPrice = basePrice + addonsTotal;

    const cartItem = {
      cartId: Date.now() + Math.random(),
      id: customizingItem.id,
      name: customizingItem.name,
      sectionId: customizingSection.id,
      size: customizingSection.hasSizes ? modalSize : null,
      addons: addonsArr,
      unitPrice,
      qty: modalQty,
      lineTotal: unitPrice * modalQty
    };

    setCart(prev => [...prev, cartItem]);
    setCustomizingItem(null);
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // WhatsApp Order
  const handleWhatsAppCheckout = () => {
    if (!custName.trim()) {
      alert('من فضلك اكتب اسمك');
      return;
    }
    if (!custPhone.trim()) {
      alert('من فضلك اكتب رقم هاتفك للتواصل');
      return;
    }
    if (cart.length === 0) return;

    const orderId = 'AGB-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    let msg = `*طلب جديد — مطعم عجيبة (البدرشين)*\n`;
    msg += `---------------------------------\n`;
    msg += `رقم الطلب: ${orderId}\n`;
    msg += `التاريخ: ${dateStr} (${timeStr})\n`;
    msg += `---------------------------------\n`;
    msg += `العميل: ${custName.trim()}\n`;
    msg += `الهاتف: ${custPhone.trim()}\n`;
    if (custAddress.trim()) msg += `العنوان: ${custAddress.trim()}\n`;
    msg += `---------------------------------\n`;
    msg += `*قائمة الأصناف:*\n`;

    cart.forEach((item, idx) => {
      msg += `\n${idx + 1}. ${item.name}`;
      if (item.size) msg += ` (${item.size === 'L' ? 'كبير' : 'صغير'})`;
      if (item.qty > 1) msg += ` × ${item.qty}`;
      msg += ` = ${item.lineTotal} ج`;
      if (item.addons && item.addons.length > 0) {
        msg += `\n   + إضافات: ${item.addons.map(a => a.name).join('، ')}`;
      }
    });

    msg += `\n\n---------------------------------\n`;
    msg += `*الإجمالي المطلوب: ${totalCartPrice} جنيه*\n`;
    if (custNotes.trim()) msg += `ملاحظات: ${custNotes.trim()}\n`;
    msg += `\nعجيبة — الراعي الرسمي للسعادة`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    if (isSearching) {
      setSearchQuery('');
    }
    if (itemsContainerRef.current) {
      itemsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] text-[#FFFFFF] font-sans antialiased selection:bg-[#C41E24] selection:text-white pb-28">
      {/* ─── Background Subtle Street Texture Overlay ─── */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.035] z-0" 
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* ─── TOP HEADER ─── */}
      <header className="sticky top-0 z-40 bg-[#161619]/95 backdrop-blur-md border-b border-[#27272A] shadow-lg">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            <img 
              src={logoImg} 
              alt="شعار مطعم عجيبة" 
              className="w-11 h-11 rounded-xl object-cover border-2 border-[#F5A623]/40 shadow-md shadow-black/40"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-heading font-black text-xl text-[#FFFFFF] tracking-tight leading-none">
                  مطعم عجيبة
                </h1>
                <span className="text-[10px] font-bold font-heading bg-[#C41E24] text-white px-1.5 py-0.5 rounded shadow-sm">
                  الأصلي
                </span>
              </div>
              <p className="text-[11px] text-[#F5A623] font-medium mt-0.5 font-heading">
                الراعي الرسمي للسعادة
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <motion.a 
              whileTap={{ scale: 0.92 }}
              href={`tel:${PHONE_NUMBER}`}
              className="w-9 h-9 rounded-full bg-[#1F1F24] border border-[#2E2E33] flex items-center justify-center text-[#B8B8C0] hover:text-white hover:border-[#F5A623]/50 transition-colors"
              title="اتصال هاتفي"
            >
              <Phone size={16} />
            </motion.a>
            <motion.a 
              whileTap={{ scale: 0.92 }}
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank" 
              rel="noopener"
              className="w-9 h-9 rounded-full bg-[#1F1F24] border border-[#2E2E33] flex items-center justify-center text-[#25D366] hover:border-[#25D366]/50 transition-colors"
              title="واتساب مباشر"
            >
              <MessageCircle size={16} />
            </motion.a>
          </div>
        </div>

        {/* Live Working Hours Bar */}
        <div className="bg-[#121214] border-t border-[#222226] py-1.5 px-4 text-[11px] flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2 w-2">
              {isStoreOpen && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isStoreOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className={isStoreOpen ? 'text-emerald-400' : 'text-rose-400'}>
              {isStoreOpen ? 'مفتوح الآن • حتى 5:00 فجراً' : 'مغلق حالياً • يفتح 10:00 صباحاً'}
            </span>
          </div>
          <span className="text-[#888890] flex items-center gap-1">
            <MapPin size={11} className="text-[#F5A623]" />
            البدرشين — شارع عباس عناني
          </span>
        </div>
      </header>

      {/* ─── MAIN HERO BANNER ─── */}
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-3 pb-2">
        {/* Street Trust Bar with Official Logo */}
        <div className="bg-gradient-to-r from-[#1E1E24] via-[#1A1A1D] to-[#1E1E24] border border-[#2E2E35] rounded-xl p-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={logoImg} 
              alt="مطعم عجيبة" 
              className="w-9 h-9 rounded-lg object-cover border border-[#F5A623]/30 shrink-0 shadow-sm"
            />
            <div>
              <div className="text-xs font-bold text-white font-heading">
                توصيل سريع لأي مكان في الجيزة
              </div>
              <div className="text-[11px] text-[#B8B8C0]">
                البدرشين والقرى المجاورة طازة وسخن
              </div>
            </div>
          </div>
          <div className="text-left font-heading">
            <span className="text-[10px] text-[#888890] block">خدمة التوصيل</span>
            <span className="text-xs font-bold text-[#F5A623]">{PHONE_NUMBER}</span>
          </div>
        </div>

        {/* Search Bar with Instant Clear */}
        <div className="relative mt-3">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888890]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في كل المنيو (كريب، بيتزا، رانش، حواوشي...)"
            className="w-full h-11 bg-[#1A1A1D] border border-[#2E2E35] focus:border-[#C41E24] rounded-xl pr-10 pl-10 text-sm text-white placeholder-[#71717A] outline-none transition-colors"
          />
          {searchQuery && (
            <motion.button 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClearSearch}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#27272A] text-[#B8B8C0] hover:text-white flex items-center justify-center transition-colors"
              title="مسح البحث"
            >
              <X size={14} />
            </motion.button>
          )}
        </div>
      </div>

      {/* ─── CATEGORIES GRID (MOBILE FIRST 2-COLS) ─── */}
      <section className="relative z-10 max-w-xl mx-auto px-4 mt-3">
        <div className="flex items-baseline justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black font-heading text-white tracking-wide">
              أقسام المنيو
            </h2>
            <BrushAccent color="#F5A623" width={60} height={5} />
          </div>
          <button 
            onClick={() => handleCategoryClick('all')}
            className={`text-xs font-heading font-bold px-2 py-1 rounded transition-colors ${
              activeCategory === 'all' && !isSearching
                ? 'text-[#F5A623] bg-[#F5A623]/10' 
                : 'text-[#888890] hover:text-white'
            }`}
          >
            عرض الكل ({MENU_DATA.reduce((s, c) => s + c.items.length, 0)})
          </button>
        </div>

        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.04 }
            }
          }}
          className="grid grid-cols-2 md:grid-cols-3 gap-2.5"
        >
          {MENU_DATA.map((cat) => {
            const isSelected = activeCategory === cat.id && !isSearching;
            return (
              <motion.div
                key={cat.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
                }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleCategoryClick(cat.id)}
                className={`relative h-24 rounded-xl overflow-hidden cursor-pointer bg-[#1A1A1D] border transition-all ${
                  isSelected 
                    ? 'border-[#C41E24] shadow-[0_0_0_1px_#C41E24,0_4px_16px_rgba(196,30,36,0.35)]' 
                    : 'border-[#27272A] hover:border-[#3F3F46]'
                }`}
              >
                {/* Background Image with Fallback */}
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  loading="lazy"
                />

                {/* Scrim Gradient */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#121214] via-[#121214]/75 to-black/30" />

                {/* Active Indicator Pin */}
                {isSelected && (
                  <div className="absolute top-2 left-2 z-20 w-2 h-2 rounded-full bg-[#C41E24] shadow-[0_0_6px_#C41E24]" />
                )}

                {/* Card Content */}
                <div className="relative z-20 h-full p-2.5 flex flex-col justify-end">
                  <h3 className="font-heading font-extrabold text-sm text-white drop-shadow leading-tight">
                    {cat.title}
                  </h3>
                  <span className="text-[10px] text-[#B8B8C0] font-medium mt-0.5">
                    {cat.items.length} صنف
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ─── ITEMS LIST CONTAINER (VERTICAL & CLEAN) ─── */}
      <main ref={itemsContainerRef} className="relative z-10 max-w-xl mx-auto px-4 mt-6">
        {/* Search Results Summary Header */}
        {isSearching && (
          <div className="bg-[#1A1A1D] border border-[#2E2E35] rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F5A623]"></span>
              <span className="text-sm font-heading font-bold text-white">
                نتائج البحث عن «{searchQuery}»
              </span>
            </div>
            <span className="text-xs font-heading font-extrabold text-[#F5A623] bg-[#F5A623]/10 px-2 py-0.5 rounded">
              {totalSearchResults} أصناف
            </span>
          </div>
        )}

        {filteredSections.length === 0 ? (
          <div className="bg-[#1A1A1D] border border-[#27272A] rounded-2xl p-8 text-center my-4">
            <div className="w-12 h-12 rounded-full bg-[#27272A] flex items-center justify-center mx-auto mb-3 text-[#888890]">
              <Search size={22} />
            </div>
            <div className="text-base font-bold font-heading text-white">
              لا توجد نتائج مطابقة لـ «{searchQuery}»
            </div>
            <p className="text-xs text-[#888890] mt-1.5 max-w-xs mx-auto leading-relaxed">
              تأكد من كتابة الكلمة بشكل صحيح، أو اضغط بالأسفل لعرض كامل أصناف المنيو
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClearSearch}
              className="mt-4 px-5 py-2.5 bg-[#C41E24] hover:bg-[#A8171C] text-white text-xs font-heading font-extrabold rounded-xl transition-colors shadow-md inline-flex items-center gap-1.5"
            >
              عرض كل المنيو
            </motion.button>
          </div>
        ) : (
          filteredSections.map((section) => (
            <div key={section.id} className="mb-6">
              {/* Section Header with Brush Accent */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#27272A]">
                <div>
                  <h3 className="text-lg font-black font-heading text-white tracking-wide">
                    {section.title}
                  </h3>
                  <BrushAccent color="#C41E24" width={75} height={6} />
                </div>
                <span className="text-xs text-[#888890] font-heading font-semibold">
                  {section.items.length} أصناف
                </span>
              </div>

              {/* Items Vertical Stack (No Item Images) */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl divide-y divide-[#27272A] overflow-hidden shadow-sm">
                {section.items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileTap={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    onClick={() => handleItemSelect(item, section)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    {/* Right: Name + Category Badge (in search) + Single-line Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-bold text-[15px] text-white leading-snug">
                          {item.name}
                        </span>
                        {/* Section badge shown during search */}
                        {isSearching && (
                          <span className="text-[10px] font-heading font-semibold text-[#B8B8C0] bg-[#27272A] px-1.5 py-0.2 rounded border border-[#3F3F46]">
                            {section.title}
                          </span>
                        )}
                        {item.tag && (
                          <span className="text-[10px] font-heading font-extrabold text-[#F5A623] bg-[#F5A623]/10 border border-[#F5A623]/25 px-1.5 py-0.2 rounded">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      {item.desc && (
                        <p className="text-xs text-[#B8B8C0] mt-1 line-clamp-1 font-normal leading-relaxed">
                          {item.desc}
                        </p>
                      )}
                    </div>

                    {/* Left: Prices + Quick Add Button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left font-heading">
                        {section.hasSizes ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFFFFF]">
                            <span>ص: <strong className="text-[#F5A623]">{item.priceS}</strong></span>
                            <span className="text-[#3F3F46]">/</span>
                            <span>ك: <strong className="text-[#C41E24]">{item.priceL}</strong></span>
                            <span className="text-[10px] text-[#888890]">ج</span>
                          </div>
                        ) : (
                          <div className="text-base font-black text-[#F5A623]">
                            {item.price} <span className="text-xs text-[#888890] font-normal">ج</span>
                          </div>
                        )}
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        aria-label={`إضافة ${item.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemSelect(item, section);
                        }}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-[#C41E24] hover:bg-[#A8171C] text-white flex items-center justify-center font-bold shadow-md transition-colors"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Return to Categories shortcut when filtered */}
        {activeCategory !== 'all' && !isSearching && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCategoryClick('all')}
            className="w-full py-2.5 mt-2 bg-[#1A1A1D] border border-dashed border-[#2E2E35] rounded-xl text-xs font-heading font-bold text-[#F5A623] flex items-center justify-center gap-1.5 hover:bg-[#222227] transition-colors"
          >
            <ArrowUp size={14} />
            العودة لجميع الأقسام
          </motion.button>
        )}
      </main>

      {/* ─── OFFICIAL STORE PLEDGE FOOTER ─── */}
      <footer className="relative z-10 max-w-xl mx-auto px-4 mt-12 mb-6">
        <div className="bg-gradient-to-b from-[#1A1A1D] to-[#141416] border border-[#27272A] rounded-2xl p-6 text-center shadow-lg">
          <img 
            src={logoImg} 
            alt="شعار مطعم عجيبة الرسمي" 
            className="w-16 h-16 rounded-2xl mx-auto mb-3.5 object-cover border-2 border-[#F5A623] shadow-lg shadow-[#F5A623]/10"
          />

          <p className="font-heading font-black text-base text-[#F5A623] tracking-wide mb-1.5">
            «إن أرضيناك فتحدث عنا.. وإن لم نرضيك فتحدث إلينا»
          </p>
          <p className="text-xs text-[#B8B8C0] max-w-sm mx-auto mb-4 leading-relaxed font-normal">
            مطعم عجيبة — البدرشين، شارع عباس عناني بجوار كازيون ماركت. طعم أصيل وجودة تليق بأهلنا.
          </p>

          <div className="flex items-center justify-center gap-2.5">
            <motion.a
              whileTap={{ scale: 0.95 }}
              href={`tel:${PHONE_NUMBER}`}
              className="px-4 py-2 bg-[#1F1F24] border border-[#2E2E35] rounded-xl text-xs font-heading font-bold text-white flex items-center gap-1.5 hover:bg-[#26262B]"
            >
              <Phone size={14} className="text-[#C41E24]" />
              {PHONE_NUMBER}
            </motion.a>
            <motion.a
              whileTap={{ scale: 0.95 }}
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener"
              className="px-4 py-2 bg-[#25D366]/15 border border-[#25D366]/30 rounded-xl text-xs font-heading font-bold text-[#25D366] flex items-center gap-1.5 hover:bg-[#25D366]/25"
            >
              <MessageCircle size={14} />
              واتساب عجيبة
            </motion.a>
          </div>
        </div>
      </footer>

      {/* ─── FLOATING STICKY CART BAR (ANIMATE PRESENCE) ─── */}
      <AnimatePresence>
        {totalCartCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto"
          >
            <div 
              onClick={() => setIsCartOpen(true)}
              className="bg-[#C41E24] hover:bg-[#B31A20] text-white rounded-2xl p-3 px-4 shadow-[0_8px_30px_rgba(196,30,36,0.5)] flex items-center justify-between cursor-pointer border border-[#E03A40]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/25 flex items-center justify-center relative border border-white/10">
                  <ShoppingBag size={19} className="text-white" />
                  <span className="absolute -top-1.5 -right-1.5 bg-[#F5A623] text-black text-[11px] font-heading font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {totalCartCount}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-white/80 block font-heading">
                    السلة الحالية
                  </span>
                  <span className="text-lg font-heading font-black text-white leading-tight">
                    {totalCartPrice} <span className="text-xs font-normal">جنيه</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-heading font-bold bg-white text-[#C41E24] px-4 py-2.5 rounded-xl shadow-sm">
                <span>إتمام الطلب</span>
                <ChevronDown size={14} className="rotate-[-90deg]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ITEM CUSTOMIZATION BOTTOM SHEET ─── */}
      <AnimatePresence>
        {customizingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingItem(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto bg-[#18181B] border-t border-[#27272A] rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Handle */}
              <div className="w-12 h-1.5 bg-[#2E2E35] rounded-full mx-auto my-3" />

              <div className="p-5 pt-1">
                {/* Header with Item Title and Official Logo seal */}
                <div className="flex items-start justify-between pb-3 border-b border-[#27272A]">
                  <div className="flex items-start gap-3">
                    <img 
                      src={logoImg} 
                      alt="عجيبة" 
                      className="w-8 h-8 rounded-lg object-cover border border-[#F5A623]/30 shrink-0 mt-0.5" 
                    />
                    <div>
                      <h3 className="font-heading font-black text-xl text-white">
                        {customizingItem.name}
                      </h3>
                      {customizingItem.desc && (
                        <p className="text-xs text-[#B8B8C0] mt-1">{customizingItem.desc}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setCustomizingItem(null)}
                    className="p-1 rounded-full text-[#888890] hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Size Selector */}
                {customizingSection?.hasSizes && (
                  <div className="mt-4">
                    <label className="block text-xs font-heading font-bold text-[#F5A623] mb-2">
                      اختر الحجم المطلوب:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setModalSize('S')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          modalSize === 'S'
                            ? 'bg-[#C41E24]/15 border-[#C41E24] text-white shadow-[0_0_12px_rgba(196,30,36,0.25)]'
                            : 'bg-[#1F1F24] border-[#27272A] text-[#B8B8C0]'
                        }`}
                      >
                        <div className="font-heading font-bold text-sm">حجم صغير</div>
                        <div className="font-heading font-extrabold text-[#F5A623] text-base mt-0.5">
                          {customizingItem.priceS} ج
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalSize('L')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          modalSize === 'L'
                            ? 'bg-[#C41E24]/15 border-[#C41E24] text-white shadow-[0_0_12px_rgba(196,30,36,0.25)]'
                            : 'bg-[#1F1F24] border-[#27272A] text-[#B8B8C0]'
                        }`}
                      >
                        <div className="font-heading font-bold text-sm">حجم كبير</div>
                        <div className="font-heading font-extrabold text-[#F5A623] text-base mt-0.5">
                          {customizingItem.priceL} ج
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Addons List */}
                {customizingSection?.addons && customizingSection.addons.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-xs font-heading font-bold text-[#F5A623] mb-2">
                      إضافات وتعديلات (اختياري):
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {customizingSection.addons.map((addon) => {
                        const key = `${addon.id}|${addon.name}|${addon.price}`;
                        const isChecked = modalAddons.has(key);
                        return (
                          <div
                            key={addon.id}
                            onClick={() => {
                              setModalAddons(prev => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              });
                            }}
                            className={`p-2.5 px-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-[#F5A623]/10 border-[#F5A623] text-white'
                                : 'bg-[#1A1A1D] border-[#27272A] text-[#B8B8C0]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-black font-bold text-xs ${
                                isChecked ? 'bg-[#F5A623] border-[#F5A623]' : 'border-[#3F3F46]'
                              }`}>
                                {isChecked && <Check size={13} strokeWidth={3} />}
                              </div>
                              <span className="text-xs font-heading font-medium">{addon.name}</span>
                            </div>
                            <span className="text-xs font-heading font-bold text-[#F5A623]">
                              +{addon.price} ج
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-[#27272A]">
                  <span className="text-xs font-heading font-bold text-white">الكمية المطلوبة</span>
                  <div className="flex items-center gap-3 bg-[#1A1A1D] border border-[#27272A] rounded-xl p-1">
                    <button
                      onClick={() => setModalQty(q => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg bg-[#27272A] text-white flex items-center justify-center font-bold"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-heading font-extrabold text-sm">{modalQty}</span>
                    <button
                      onClick={() => setModalQty(q => q + 1)}
                      className="w-8 h-8 rounded-lg bg-[#27272A] text-white flex items-center justify-center font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Add to Cart Submit */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={confirmCustomization}
                  className="w-full mt-5 py-3.5 bg-[#C41E24] hover:bg-[#A8171C] text-white rounded-xl font-heading font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C41E24]/30"
                >
                  <Plus size={16} />
                  <span>إضافة إلى السلة</span>
                  <span className="bg-black/25 px-2 py-0.5 rounded text-xs font-mono">
                    {(
                      ((customizingSection?.hasSizes 
                        ? (modalSize === 'L' ? customizingItem.priceL : customizingItem.priceS)
                        : customizingItem.price) + 
                       Array.from(modalAddons).reduce((s, k) => s + parseInt(k.split('|')[2], 10), 0)
                      ) * modalQty
                    )} ج
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── FULL CART & CHECKOUT SHEET ─── */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto bg-[#18181B] border-t border-[#27272A] rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-[#2E2E35] rounded-full mx-auto my-3" />

              <div className="p-5 pt-1">
                <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={logoImg} 
                      alt="لوجو عجيبة" 
                      className="w-8 h-8 rounded-lg object-cover border border-[#F5A623]/30" 
                    />
                    <h3 className="font-heading font-black text-xl text-white">
                      سلة طلبات عجيبة
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1 rounded-full text-[#888890] hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-12 text-[#888890]">
                    <ShoppingBag size={40} className="mx-auto mb-2 opacity-30 text-[#B8B8C0]" />
                    <div className="text-base font-bold font-heading text-white">السلة فارغة</div>
                    <p className="text-xs mt-1">اختر أشهى أصناف مطعم عجيبة وأضفها للسلة</p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items List */}
                    <div className="divide-y divide-[#27272A] max-h-56 overflow-y-auto my-2 pr-1">
                      {cart.map((item) => (
                        <div key={item.cartId} className="py-3 flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-heading font-bold text-sm text-white">
                              {item.qty > 1 && <span className="text-[#F5A623]">{item.qty} × </span>}
                              {item.name}
                              {item.size && (
                                <span className="text-xs text-[#888890] font-normal mr-1">
                                  ({item.size === 'L' ? 'كبير' : 'صغير'})
                                </span>
                              )}
                            </div>
                            {item.addons && item.addons.length > 0 && (
                              <div className="text-[11px] text-[#B8B8C0] mt-0.5">
                                + {item.addons.map(a => a.name).join('، ')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-heading font-black text-sm text-[#F5A623]">
                              {item.lineTotal} ج
                            </span>
                            <button
                              onClick={() => removeFromCart(item.cartId)}
                              className="text-[#888890] hover:text-[#C41E24] p-1"
                              title="حذف"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Summary */}
                    <div className="bg-[#1F1F24] border border-[#2E2E35] rounded-xl p-3 flex items-center justify-between mt-3">
                      <span className="font-heading font-bold text-sm text-white">الإجمالي النهائي</span>
                      <span className="font-heading font-black text-xl text-[#F5A623]">
                        {totalCartPrice} <span className="text-xs text-[#888890]">جنيه</span>
                      </span>
                    </div>

                    {/* Customer Info Form */}
                    <div className="mt-4 space-y-2.5 bg-[#141416] border border-[#27272A] rounded-2xl p-4">
                      <div className="text-xs font-heading font-bold text-[#F5A623] mb-1">
                        بيانات استلام الطلب:
                      </div>

                      <div>
                        <input
                          type="text"
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="الاسم بالكامل *"
                          className="w-full h-10 bg-[#1F1F24] border border-[#2E2E35] focus:border-[#C41E24] rounded-lg px-3 text-xs text-white placeholder-[#71717A] outline-none"
                        />
                      </div>

                      <div>
                        <input
                          type="tel"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="رقم الهاتف للتواصل *"
                          className="w-full h-10 bg-[#1F1F24] border border-[#2E2E35] focus:border-[#C41E24] rounded-lg px-3 text-xs text-white placeholder-[#71717A] outline-none"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          value={custAddress}
                          onChange={(e) => setCustAddress(e.target.value)}
                          placeholder="العنوان التفصيلي (للتوصيل)"
                          className="w-full h-10 bg-[#1F1F24] border border-[#2E2E35] focus:border-[#C41E24] rounded-lg px-3 text-xs text-white placeholder-[#71717A] outline-none"
                        />
                      </div>

                      <div>
                        <textarea
                          value={custNotes}
                          onChange={(e) => setCustNotes(e.target.value)}
                          placeholder="ملاحظات على التحضير (بدون مخلل، صوص إضافي...)"
                          rows={2}
                          className="w-full bg-[#1F1F24] border border-[#2E2E35] focus:border-[#C41E24] rounded-lg p-2.5 text-xs text-white placeholder-[#71717A] outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* WhatsApp Checkout Button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleWhatsAppCheckout}
                      className="w-full mt-4 py-3.5 bg-[#25D366] hover:bg-[#20BA59] text-black font-heading font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-colors"
                    >
                      <MessageCircle size={18} />
                      <span>إرسال الطلب فوراً عبر واتساب</span>
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── SCROLL TO TOP FLOATING BUTTON ─── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-20 left-4 z-30 w-10 h-10 rounded-full bg-[#1F1F24] border border-[#2E2E35] text-[#B8B8C0] hover:text-white flex items-center justify-center shadow-lg transition-colors"
            title="الصعود للأعلى"
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
