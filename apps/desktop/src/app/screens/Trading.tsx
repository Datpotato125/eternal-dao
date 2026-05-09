import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuth';
import { COLORS } from '../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  common:    COLORS.textMuted,
  uncommon:  '#4a9c4a',
  rare:      '#3a70b0',
  epic:      '#8040b0',
  legendary: COLORS.gold,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingRow {
  id: string;
  seller_id: string;
  seller_name: string;
  item_id: string;
  item_name: string;
  item_rarity: string;
  item_type: string;
  quantity: number;
  price_stones: number;
  created_at: string;
}

interface InvRow {
  item_id: string;
  item_name: string;
  item_rarity: string;
  item_type: string;
  quantity: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtStones(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  if (m >= 1)  return `${m}m ago`;
  return 'just now';
}

function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: RARITY_COLOR[rarity] ?? COLORS.textMuted,
      textTransform: 'uppercase', letterSpacing: 1,
    }}>
      {rarity}
    </span>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function Trading() {
  const { character, fetchCharacter } = useAuth();

  const [browse,     setBrowse]     = useState<ListingRow[]>([]);
  const [myListings, setMyListings] = useState<ListingRow[]>([]);
  const [inventory,  setInventory]  = useState<InvRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [busy,       setBusy]       = useState(false);
  const [errMsg,     setErrMsg]     = useState('');

  // List form
  const [selItemId,  setSelItemId]  = useState('');
  const [listQty,    setListQty]    = useState(1);
  const [listPrice,  setListPrice]  = useState('');

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!character) return;
    setLoading(true);
    setErrMsg('');
    try {
      const [{ data: browseRaw }, { data: myRaw }, { data: invRaw }] = await Promise.all([
        supabase
          .from('listings')
          .select('*, items(name, rarity, type), characters!seller_id(players!player_id(username))')
          .eq('server_id', character.server_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),

        supabase
          .from('listings')
          .select('*, items(name, rarity, type)')
          .eq('seller_id', character.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),

        supabase
          .from('inventory')
          .select('item_id, quantity, items(name, rarity, type)')
          .eq('character_id', character.id)
          .gt('quantity', 0),
      ]);

      setBrowse(((browseRaw ?? []) as any[]).map(r => ({
        id:           r.id,
        seller_id:    r.seller_id,
        seller_name:  r.characters?.players?.username ?? 'Unknown',
        item_id:      r.item_id,
        item_name:    r.items?.name ?? '?',
        item_rarity:  r.items?.rarity ?? 'common',
        item_type:    r.items?.type ?? '?',
        quantity:     r.quantity,
        price_stones: r.price_stones,
        created_at:   r.created_at,
      })));

      setMyListings(((myRaw ?? []) as any[]).map(r => ({
        id:           r.id,
        seller_id:    r.seller_id,
        seller_name:  '',
        item_id:      r.item_id,
        item_name:    r.items?.name ?? '?',
        item_rarity:  r.items?.rarity ?? 'common',
        item_type:    r.items?.type ?? '?',
        quantity:     r.quantity,
        price_stones: r.price_stones,
        created_at:   r.created_at,
      })));

      setInventory(((invRaw ?? []) as any[]).map(r => ({
        item_id:     r.item_id,
        item_name:   r.items?.name ?? '?',
        item_rarity: r.items?.rarity ?? 'common',
        item_type:   r.items?.type ?? '?',
        quantity:    r.quantity,
      })));

    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [character?.id, character?.server_id]);

  useEffect(() => { load(); }, [load]);

  // Reset list form when inventory changes
  useEffect(() => {
    if (inventory.length > 0 && !selItemId) setSelItemId(inventory[0].item_id);
  }, [inventory]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function buy(listingId: string) {
    if (!character) return;
    setBusy(true); setErrMsg('');
    try {
      const { data, error } = await supabase.rpc('buy_listing', {
        p_listing_id: listingId,
        p_buyer_id:   character.id,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error ?? 'Purchase failed');
      await Promise.all([load(), fetchCharacter()]);
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function listItem() {
    if (!character || !selItemId || !listPrice) return;
    const price = parseInt(listPrice, 10);
    if (isNaN(price) || price <= 0) { setErrMsg('Price must be a positive number'); return; }
    setBusy(true); setErrMsg('');
    try {
      const { data, error } = await supabase.rpc('list_item', {
        p_seller_id: character.id,
        p_item_id:   selItemId,
        p_quantity:  listQty,
        p_price:     price,
        p_server_id: character.server_id,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error ?? 'Listing failed');
      setListPrice(''); setListQty(1);
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function cancel(listingId: string) {
    if (!character) return;
    setBusy(true); setErrMsg('');
    try {
      const { data, error } = await supabase.rpc('cancel_listing', {
        p_listing_id: listingId,
        p_seller_id:  character.id,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error ?? 'Cancel failed');
      await load();
    } catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedInvItem = inventory.find(i => i.item_id === selItemId);
  const maxQty = selectedInvItem?.quantity ?? 1;
  const stones = character?.spirit_stones ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 10, padding: '18px 20px',
  };

  const inputStyle: React.CSSProperties = {
    background: COLORS.bg, border: `1px solid ${COLORS.border}`,
    color: COLORS.text, borderRadius: 6, padding: '7px 10px',
    fontSize: 13, width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.gold, letterSpacing: 3 }}>🏪 Trading Post</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: '8px 16px',
        }}>
          <span style={{ fontSize: 16 }}>⬡</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: COLORS.gold }}>{fmtStones(stones)}</span>
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>spirit stones</span>
        </div>
      </div>

      {errMsg && (
        <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 16 }}>{errMsg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Browse ── */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
            Active Listings — {character?.server_id ? 'This Server' : 'All'}
          </div>

          {loading ? (
            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Loading…</div>
          ) : browse.length === 0 ? (
            <div style={{ color: COLORS.border, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              No listings yet. Be the first to list something.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {browse.map(row => {
                const isOwn    = row.seller_id === character?.id;
                const canAfford = stones >= row.price_stones;
                return (
                  <div key={row.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                    opacity: isOwn ? 0.6 : 1,
                  }}>
                    {/* Item info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{row.item_name}</span>
                        <RarityBadge rarity={row.item_rarity} />
                        {row.quantity > 1 && (
                          <span style={{ fontSize: 11, color: COLORS.textMuted }}>×{row.quantity}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.border, marginTop: 2 }}>
                        {row.item_type} · {row.seller_name} · {timeAgo(row.created_at)}
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.gold }}>
                        ⬡ {fmtStones(row.price_stones)}
                      </div>
                    </div>

                    {/* Buy button */}
                    <button
                      onClick={() => buy(row.id)}
                      disabled={busy || isOwn || !canAfford}
                      title={isOwn ? 'Your listing' : !canAfford ? 'Not enough spirit stones' : ''}
                      style={{
                        background: isOwn || !canAfford ? 'transparent' : COLORS.gold,
                        color:      isOwn || !canAfford ? COLORS.border : COLORS.bg,
                        border: `1px solid ${isOwn || !canAfford ? COLORS.border : COLORS.gold}`,
                        borderRadius: 6, padding: '6px 14px',
                        fontSize: 12, fontWeight: 700,
                        cursor: busy || isOwn || !canAfford ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {isOwn ? 'Yours' : 'Buy'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Sell + My Listings ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* List an item */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
              List an Item
            </div>

            {inventory.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.border }}>
                Your inventory is empty. Defeat bosses to earn items.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Item select */}
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Item</div>
                  <select
                    value={selItemId}
                    onChange={e => { setSelItemId(e.target.value); setListQty(1); }}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {inventory.map(i => (
                      <option key={i.item_id} value={i.item_id}>
                        {i.item_name} (×{i.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
                    Quantity <span style={{ color: COLORS.border }}>(max {maxQty})</span>
                  </div>
                  <input
                    type="number" min={1} max={maxQty}
                    value={listQty}
                    onChange={e => setListQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={inputStyle}
                  />
                </div>

                {/* Price */}
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Price ⬡</div>
                  <input
                    type="number" min={1} placeholder="e.g. 500"
                    value={listPrice}
                    onChange={e => setListPrice(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <button
                  onClick={listItem}
                  disabled={busy || !selItemId || !listPrice}
                  style={{
                    background: COLORS.jade, color: '#fff',
                    border: 'none', borderRadius: 6, padding: '8px 0',
                    fontSize: 13, fontWeight: 700,
                    cursor: busy || !selItemId || !listPrice ? 'not-allowed' : 'pointer',
                    opacity: busy || !selItemId || !listPrice ? 0.5 : 1,
                  }}
                >
                  List for Sale
                </button>
              </div>
            )}
          </div>

          {/* My active listings */}
          {myListings.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
                Your Listings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myListings.map(row => (
                  <div key={row.id} style={{
                    padding: '8px 10px', borderRadius: 7,
                    border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{row.item_name}</span>
                        {row.quantity > 1 && <span style={{ fontSize: 11, color: COLORS.textMuted }}> ×{row.quantity}</span>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold }}>⬡ {fmtStones(row.price_stones)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: COLORS.border }}>{timeAgo(row.created_at)}</span>
                      <button
                        onClick={() => cancel(row.id)}
                        disabled={busy}
                        style={{
                          background: 'transparent', color: COLORS.textMuted,
                          border: `1px solid ${COLORS.border}`, borderRadius: 5,
                          padding: '3px 10px', fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
