import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Store } from "./store";
import Layout from "./layout";
import Home from "./home";
import "./style.css";
const Catalog = lazy(() =>
    import("./catalog").then((m) => ({ default: m.Catalog })),
  ),
  Detail = lazy(() => import("./catalog").then((m) => ({ default: m.Detail }))),
  Account = lazy(() =>
    import("./account").then((m) => ({ default: m.Account })),
  ),
  Reset = lazy(() => import("./account").then((m) => ({ default: m.Reset }))),
  Cart = lazy(() => import("./commerce").then((m) => ({ default: m.Cart }))),
  Checkout = lazy(() =>
    import("./commerce").then((m) => ({ default: m.Checkout })),
  ),
  Orders = lazy(() =>
    import("./commerce").then((m) => ({ default: m.Orders })),
  ),
  Info = lazy(() => import("./info")),
  Admin = lazy(() => import("./admin"));
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Store>
      <Suspense fallback={<div className="skeleton" aria-busy="true" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="products/:sku" element={<Detail />} />
            <Route path="account" element={<Account />} />
            <Route path="account/reset" element={<Reset />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<Orders />} />
            <Route path="confirmation/:id" element={<Orders />} />
            <Route path="orders/:id" element={<Orders />} />
            <Route path="*" element={<Info />} />
          </Route>
          <Route path="admin/*" element={<Admin />} />
        </Routes>
      </Suspense>
    </Store>
  </BrowserRouter>,
);
