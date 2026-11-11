/* ==========================================================
   Grampe dashboard — DEMO DATA
   Fictional values for the UI prototype. Replace with API
   responses when the dashboard is connected to the backend.
   ========================================================== */
window.GRAMPE_DEMO = {
  user: { id: "100245", name: "Aarav Mehta", first: "Aarav", email: "aarav@example.com", mobile: "98765 43210", country: "India", code: "+91", refLink: "https://www.grampe.co/signup.html?Ref=100245", joined: "2025-03-14" },

  /* people who joined with the user's referral link (demo) */
  referrals: [
    { id: "100377", name: "Rohan Sharma", joined: "2026-11-08", status: "Verified" },
    { id: "100362", name: "Priya Nair", joined: "2026-10-27", status: "Verified" },
    { id: "100351", name: "Karan Patel", joined: "2026-10-19", status: "Pending" },
    { id: "100318", name: "Sneha Iyer", joined: "2026-09-30", status: "Verified" },
    { id: "100296", name: "Vikram Das", joined: "2026-09-12", status: "Verified" }
  ],

  usdInr: 83.2,

  networks: [
    { id: "gram", name: "Gram Chain", explorer: "https://gccscan.com" },
    { id: "eth", name: "Ethereum", explorer: "https://etherscan.io" },
    { id: "bsc", name: "Binance", explorer: "https://bscscan.com" },
    { id: "ton", name: "TON", explorer: "https://tonviewer.com" },
    { id: "shop", name: "ShoppingTON", explorer: "https://tonviewer.com" },
    { id: "tron", name: "Tron", explorer: "https://tronscan.org" },
    { id: "xlm", name: "Stellar", explorer: "https://stellar.expert" }
  ],

  /* price in USD, change = 24h % */
  assets: [
    { sym: "GINR", name: "GINR", net: "gram", coin: "coin-ginr", mark: "₹", price: 0.012, change: 0.0, bal: 18450.25, addr: "0x4a7C1d9E0b2F38a6C5e1d3B9F7a2c4E6d8B0a1F3", dp: 2 },
    { sym: "GCC", name: "Gram Chain", net: "gram", coin: "coin-gcc", mark: "G", price: 1.21, change: 2.4, bal: 42.8, addr: "0x4a7C1d9E0b2F38a6C5e1d3B9F7a2c4E6d8B0a1F3", dp: 4 },
    { sym: "TON", name: "TON", net: "ton", coin: "coin-ton", mark: "T", price: 1.19, change: -1.8, bal: 12.5, addr: "UQB7xK2mP9vR4tN8wQ1zL6cY3hJ5fD0sA2gE7bU9oI4kM1nX", dp: 4 },
    { sym: "USDT", name: "USDT (BEP20)", net: "bsc", coin: "coin-usdt", mark: "$", price: 1.0, change: 0.01, bal: 64.3, addr: "0x4a7C1d9E0b2F38a6C5e1d3B9F7a2c4E6d8B0a1F3", dp: 2, key: "USDT.BEP20" },
    { sym: "USDT", name: "USDT (ERC20)", net: "eth", coin: "coin-usdt", mark: "$", price: 1.0, change: 0.01, bal: 0, addr: "0x9E2b4F6a8C0d1E3f5A7b9C1d3E5f7A9b1C3d5E7f", dp: 2, key: "USDT.ERC20" },
    { sym: "BNB", name: "Binance", net: "bsc", coin: "coin-bnb", mark: "B", price: 598.4, change: 1.1, bal: 0.0042, addr: "0x4a7C1d9E0b2F38a6C5e1d3B9F7a2c4E6d8B0a1F3", dp: 4 },
    { sym: "ETH", name: "Ethereum", net: "eth", coin: "coin-eth", mark: "Ξ", price: 3180.5, change: -0.6, bal: 0.0, addr: "0x9E2b4F6a8C0d1E3f5A7b9C1d3E5f7A9b1C3d5E7f", dp: 4 },
    { sym: "SHOP", name: "ShoppingTON", net: "shop", coin: "coin-shop", mark: "S", price: 1.2, change: 3.2, bal: 2.1, addr: "UQB7xK2mP9vR4tN8wQ1zL6cY3hJ5fD0sA2gE7bU9oI4kM1nX", dp: 4 },
    { sym: "XLM", name: "Stellar", net: "xlm", coin: "coin-xlm", mark: "✦", price: 0.11, change: 0.7, bal: 0, addr: "GBT4QX7ZK2M9P5R3V8W1N6Y4H2J7F5D3S9A1L8C6B4E2G7XZQ4", dp: 4 }
  ],

  /* swap targets on the live site: USDT.BEP20, GCC, GINR. GCC only from USDT. */
  swapTargets: ["USDT.BEP20", "GCC", "GINR"],

  history: [
    { id: "t1", type: "receive", asset: "GINR", amount: 2500, from: "user 100377", date: "2026-11-11T10:24:00", status: "Completed" },
    { id: "t2", type: "swap", asset: "TON", amount: 10, to: "GINR", toAmount: 1472.6, date: "2026-11-10T18:03:00", status: "Completed" },
    { id: "t3", type: "upi", asset: "GINR", amount: 1200, to: "rahul@okaxis", date: "2026-11-09T13:41:00", status: "Completed" },
    { id: "t4", type: "send", asset: "USDT.BEP20", amount: 25, to: "0x71C2...9a3E", date: "2026-11-07T21:12:00", status: "Completed" },
    { id: "t5", type: "swap", asset: "TON", amount: 5, to: "USDT.BEP20", toAmount: 5.92, date: "2026-11-05T09:30:00", status: "Completed" },
    { id: "t6", type: "transfer", asset: "GCC", amount: 3, to: "user 100512", date: "2026-11-02T16:55:00", status: "Completed" },
    { id: "t7", type: "receive", asset: "TON", amount: 12.5, from: "UQC9...k2Lp", date: "2026-10-30T11:20:00", status: "Completed" },
    { id: "t8", type: "gift", asset: "GINR", amount: 500, to: "Shopping voucher", date: "2026-10-28T19:45:00", status: "Completed" }
  ],

  giftCards: [
    { id: "g1", name: "Shopping", tag: "Fashion, electronics & more", tone: "tone-primary", icon: "i-gift", denoms: [250, 500, 1000, 2000] },
    { id: "g2", name: "Food & dining", tag: "Restaurants and delivery", tone: "tone-warning", icon: "i-star", denoms: [200, 500, 1000] },
    { id: "g3", name: "Travel", tag: "Flights, buses and hotels", tone: "tone-sky", icon: "i-plane", denoms: [1000, 2500, 5000] },
    { id: "g4", name: "Entertainment", tag: "Movies, music and OTT", tone: "tone-violet", icon: "i-tv", denoms: [199, 499, 999] },
    { id: "g5", name: "Groceries", tag: "Daily essentials", tone: "tone-success", icon: "i-coins", denoms: [500, 1000, 2000] },
    { id: "g6", name: "Fuel", tag: "Petrol and diesel", tone: "tone-dark", icon: "i-car", denoms: [500, 1000, 2000] }
  ],

  notifications: [
    { title: "₹2,500 GINR received", text: "From user 100377", time: "2h ago", icon: "i-receive", tone: "tone-success" },
    { title: "Swap completed", text: "10 TON → 1,472.60 GINR", time: "Yesterday", icon: "i-swap", tone: "tone-primary" },
    { title: "RuPay card is coming soon", text: "We'll let you know when you can activate it", time: "3 days ago", icon: "i-card", tone: "tone-violet" }
  ],

  /* demo fees by network (in the asset being sent) */
  fees: { gram: 0.0, eth: 0.0006, bsc: 0.0002, ton: 0.01, shop: 0.01, tron: 1, xlm: 0.0001 },
  swapFeePct: 0.3
};
