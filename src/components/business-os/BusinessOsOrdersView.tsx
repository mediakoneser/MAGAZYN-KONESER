import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  PackageCheck,
  Truck,
  CheckCircle,
  Clock,
  Warehouse,
  ExternalLink,
  FileText,
  User,
  MapPin,
  RefreshCw,
  AlertCircle,
  Tag,
} from "lucide-react";
import { Order, OrderFulfillmentStatus, OrderChannel } from "../../types/businessCore";
import { businessCoreService } from "../../services/businessCoreService";
import { auditLogService } from "../../services/auditLogService";

export const BusinessOsOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    setOrders(businessCoreService.getOrders());
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderFulfillmentStatus) => {
    businessCoreService.updateOrderStatus(orderId, newStatus);
    auditLogService.record({
      action: "ZMIANA_STATUSU_ZAMÓWIENIA",
      entityType: "ORDER",
      entityId: orderId,
      changesSummary: `Zmieniono status realizacji na: ${newStatus}`,
    });
    loadOrders();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, fulfillmentStatus: newStatus });
    }
  };

  const filtered = orders.filter((o) => {
    const matchesChannel = channelFilter === "ALL" || o.channel === channelFilter;
    const matchesStatus = statusFilter === "ALL" || o.fulfillmentStatus === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.externalOrderId && o.externalOrderId.toLowerCase().includes(q)) ||
      o.items.some((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    return matchesChannel && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white tracking-tight">
              Zamówienia Omnichannel (Allegro, Ovoko, ShopGold & Stacja)
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Zunifikowana realizacja zamówień ze wszystkich kanałów sprzedaży powiązana z lokalizacją regałową WMS.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
            Wszystkich: <strong className="text-white">{orders.length}</strong>
          </span>
          <span className="px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
            W realizacji:{" "}
            <strong className="text-yellow-400">
              {orders.filter((o) => o.fulfillmentStatus === "IN_PREPARATION").length}
            </strong>
          </span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po numerze zamówienia, kliencie, SKU części..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-400 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-white placeholder:text-slate-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-medium"
          >
            <option value="ALL">Wszystkie kanały</option>
            <option value="ALLEGRO">Allegro</option>
            <option value="OVOKO">Ovoko / RRR</option>
            <option value="SHOPGOLD">ShopGold</option>
            <option value="OFFLINE_STACJA">Stacja Mysłakowice</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 font-medium"
          >
            <option value="ALL">Wszystkie statusy</option>
            <option value="IN_PREPARATION">W kompletacji (WMS)</option>
            <option value="READY_FOR_PICKUP">Gotowe do wysyłki</option>
            <option value="DISPATCHED">Wysłane kurierem</option>
            <option value="DELIVERED">Dostarczone</option>
          </select>
        </div>
      </div>

      {/* ORDERS LIST & DETAIL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ORDERS LIST */}
        <div className="lg:col-span-7 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
              Brak zamówień spełniających kryteria wyszukiwania.
            </div>
          ) : (
            filtered.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-4 bg-slate-900 border rounded-xl cursor-pointer transition ${
                  selectedOrder?.id === order.id
                    ? "border-yellow-400 bg-slate-850 shadow-md"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">{order.orderNumber}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          order.channel === "ALLEGRO"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : order.channel === "OVOKO"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : order.channel === "SHOPGOLD"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {order.channel}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-200 mt-1">{order.customerName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {order.items.length} {order.items.length === 1 ? "pozycja" : "pozycje"} •{" "}
                      {order.items[0]?.name}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black font-mono text-white">
                      {order.totalGrossPln.toFixed(2)} PLN
                    </div>
                    <span
                      className={`inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        order.fulfillmentStatus === "DELIVERED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : order.fulfillmentStatus === "IN_PREPARATION"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {order.fulfillmentStatus}
                    </span>
                  </div>
                </div>

                {/* PICKING RACK LOCATION HIGHLIGHT */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-yellow-400 font-mono">
                    <Warehouse className="w-3.5 h-3.5" />
                    <span>
                      Regał WMS: <strong>{order.items[0]?.rackLocation || "MAGDA 1"}</strong>
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {order.createdAt.substring(0, 16).replace("T", " ")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ORDER DETAILS PANEL */}
        <div className="lg:col-span-5">
          {selectedOrder ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 sticky top-20">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400">SZCZEGÓŁY ZAMÓWIENIA</span>
                  <h3 className="text-base font-black text-white font-mono">{selectedOrder.orderNumber}</h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-bold">
                  {selectedOrder.channel}
                </span>
              </div>

              {/* CLIENT & ADDRESS */}
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-200">{selectedOrder.customerName}</div>
                {selectedOrder.customerPhone && (
                  <div className="text-slate-400 font-mono">{selectedOrder.customerPhone}</div>
                )}
                <div className="text-slate-400">
                  {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.postalCode}{" "}
                  {selectedOrder.shippingAddress.city}
                </div>
                {selectedOrder.shippingAddress.pickupPoint && (
                  <div className="text-yellow-400 font-mono text-[11px]">
                    Paczkomat: {selectedOrder.shippingAddress.pickupPoint}
                  </div>
                )}
              </div>

              {/* ITEMS LIST */}
              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Pozycje z magazynu WMS
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs"
                    >
                      <div className="font-bold text-slate-100">{item.name}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                        <span>SKU: {item.sku}</span>
                        <span className="text-yellow-400 font-bold">Regał: {item.rackLocation || "MAG 01"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-300 mt-1 pt-1 border-t border-slate-850">
                        <span>
                          {item.quantity} szt. × {item.unitPriceGross} PLN
                        </span>
                        <span className="font-bold text-white font-mono">
                          {(item.quantity * item.unitPriceGross).toFixed(2)} PLN
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FULFILLMENT ACTIONS */}
              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Zmień status realizacji
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "IN_PREPARATION")}
                    className={`p-2 rounded font-bold border transition ${
                      selectedOrder.fulfillmentStatus === "IN_PREPARATION"
                        ? "bg-yellow-400 text-slate-950 border-yellow-400"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                    }`}
                  >
                    W kompletacji (WMS)
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "READY_FOR_PICKUP")}
                    className={`p-2 rounded font-bold border transition ${
                      selectedOrder.fulfillmentStatus === "READY_FOR_PICKUP"
                        ? "bg-yellow-400 text-slate-950 border-yellow-400"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                    }`}
                  >
                    Spakowane (Kurier)
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "DISPATCHED")}
                    className={`p-2 rounded font-bold border transition ${
                      selectedOrder.fulfillmentStatus === "DISPATCHED"
                        ? "bg-yellow-400 text-slate-950 border-yellow-400"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                    }`}
                  >
                    Wysłane (List przewozowy)
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "DELIVERED")}
                    className={`p-2 rounded font-bold border transition ${
                      selectedOrder.fulfillmentStatus === "DELIVERED"
                        ? "bg-emerald-500 text-slate-950 border-emerald-500"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                    }`}
                  >
                    Dostarczone / Wydane
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
              Wybierz zamówienie z listy po lewej, aby podejrzeć szczegóły i regał magazynowy.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
