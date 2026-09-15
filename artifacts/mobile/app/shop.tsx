import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import TopBar from '@/components/TopBar';
import { useTheme } from '@/context/ThemeContext';

type Product = { id: number; name: string; price: number; icon: string };
type CartItem = Product & { qty: number };

const PRODUCTS: Product[] = [
  { id: 1, name: 'Squat Belt',         price: 42, icon: 'weight-lifter' },
  { id: 2, name: 'Lifting Straps',     price: 15, icon: 'arm-flex' },
  { id: 3, name: 'Dumbbells Set',      price: 65, icon: 'dumbbell' },
  { id: 4, name: 'Jump Rope',          price: 8,  icon: 'skipping' },
  { id: 5, name: 'Compression Shirt',  price: 25, icon: 'tshirt-crew' },
  { id: 6, name: 'Training Gloves',    price: 15, icon: 'handball' },
  { id: 7, name: 'Resistance Bands',   price: 12, icon: 'human-male' },
  { id: 8, name: 'Training Shorts',    price: 23, icon: 'human-male-female' },
];

const CATEGORIES = ['All', 'Equipment', 'Apparel', 'Accessories'];

export default function ShopScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const addToCart = (p: Product) =>
    setCart(c => ({ ...c, [p.id]: { ...p, qty: (c[p.id]?.qty || 0) + 1 } }));
  const removeFromCart = (id: number) =>
    setCart(c => {
      const n = { ...c };
      if (n[id].qty > 1) n[id] = { ...n[id], qty: n[id].qty - 1 };
      else delete n[id];
      return n;
    });

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const filtered = PRODUCTS.filter(p =>
    search === '' || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (showCart) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TopBar title="My Cart" onBack={() => setShowCart(false)} showBack />
        <FlatList
          data={cartItems}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 20, paddingBottom: botPad + 100, gap: 12 }}
          ListEmptyComponent={
            <View style={styles.emptyCart}>
              <Feather name="shopping-bag" size={48} color={theme.iconMuted} />
              <Text style={[styles.emptyCartText, { color: theme.mutedText }]}>Your cart is empty</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.cartItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.cartItemIcon, { backgroundColor: theme.background }]}>
                <MaterialCommunityIcons name={item.icon as any} size={32} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cartItemName, { color: theme.primaryText }]}>{item.name}</Text>
                <Text style={[styles.cartItemPrice, { color: theme.accent }]}>${item.price} each</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => removeFromCart(item.id)} style={[styles.qtyBtn, { borderColor: theme.border }]} activeOpacity={0.7}>
                  <Feather name="minus" size={16} color={theme.secondaryText} />
                </TouchableOpacity>
                <Text style={[styles.qtyNum, { color: theme.primaryText }]}>{item.qty}</Text>
                <TouchableOpacity onPress={() => addToCart(item)} style={[styles.qtyBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]} activeOpacity={0.7}>
                  <Feather name="plus" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.cartItemTotal, { color: theme.primaryText }]}>${item.price * item.qty}</Text>
            </View>
          )}
          ListFooterComponent={cartItems.length > 0 ? (
            <View style={[styles.cartSummary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {[['Subtotal', `$${cartTotal}`], ['Shipping', 'Free'], ['Total', `$${cartTotal}`]].map(([l, v], i) => (
                <View key={l} style={[styles.cartSummaryRow, i === 2 && { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 8, paddingTop: 8 }]}>
                  <Text style={[styles.cartSummaryLabel, { color: theme.secondaryText }, i === 2 && { color: theme.primaryText, fontFamily: 'Inter_700Bold', fontSize: 16 }]}>{l}</Text>
                  <Text style={[styles.cartSummaryVal, { color: theme.primaryText }, i === 2 && { color: theme.accent, fontFamily: 'Inter_700Bold', fontSize: 18 }, l === 'Shipping' && { color: theme.primary }]}>{v}</Text>
                </View>
              ))}
            </View>
          ) : null}
        />
        {cartItems.length > 0 && (
          <View style={[styles.checkoutBar, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: botPad + 12 }]}>
            <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: theme.accent }]} activeOpacity={0.85}>
              <Text style={styles.checkoutBtnText}>Buy now — ${cartTotal}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TopBar title="GymMice Shop" showBack right={
        <TouchableOpacity onPress={() => setShowCart(true)} style={{ position: 'relative' }} activeOpacity={0.7}>
          <Feather name="shopping-bag" size={22} color={theme.primaryText} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: theme.accent }]}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      } />

      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.mutedText} />
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="Search store..."
          placeholderTextColor={theme.mutedText}
          style={[styles.searchInput, { color: theme.primaryText }]}
          returnKeyType="search"
        />
      </View>

      <View style={styles.categoriesRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} onPress={() => setCategory(c)} activeOpacity={0.7}
            style={[styles.categoryChip, { backgroundColor: category === c ? theme.primary : theme.surface, borderColor: category === c ? theme.primary : theme.border }]}>
            <Text style={[styles.categoryText, { color: category === c ? '#fff' : theme.secondaryText }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        numColumns={2}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 90, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item: p }) => {
          const inCart = cart[p.id]?.qty || 0;
          return (
            <View style={[styles.productCard, { backgroundColor: theme.surface, borderColor: inCart > 0 ? theme.primary : theme.border }]}>
              <View style={[styles.productIcon, { backgroundColor: theme.background }]}>
                <MaterialCommunityIcons name={p.icon as any} size={52} color={theme.primary} />
                {inCart > 0 && (
                  <View style={[styles.inCartBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.inCartBadgeText}>{inCart}</Text>
                  </View>
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.primaryText }]} numberOfLines={2}>{p.name}</Text>
                <View style={styles.productPriceRow}>
                  <Text style={[styles.productPrice, { color: theme.accent }]}>${p.price}</Text>
                  <TouchableOpacity onPress={() => addToCart(p)} style={[styles.addBtn, { backgroundColor: theme.accent }]} activeOpacity={0.8}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  categoriesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  categoryText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  productCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  productIcon: { height: 110, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  inCartBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  inCartBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  productInfo: { padding: 10, gap: 6 },
  productName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  addBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  cartBadge: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  // Cart
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5 },
  cartItemIcon: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cartItemName: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  cartItemPrice: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: 15, fontFamily: 'Inter_700Bold', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontFamily: 'Inter_700Bold', fontSize: 15, minWidth: 40, textAlign: 'right' },
  cartSummary: { borderRadius: 14, padding: 16, borderWidth: 1.5, marginTop: 8 },
  cartSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cartSummaryLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  cartTotalLabel: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  cartSummaryVal: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  checkoutBar: { borderTopWidth: 1, padding: 16 },
  checkoutBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 17 },
  emptyCart: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyCartText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
