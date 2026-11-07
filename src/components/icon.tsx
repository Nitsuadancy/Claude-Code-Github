import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  BellRing,
  Bike,
  BookOpen,
  CalendarClock,
  Camera,
  Check,
  ChefHat,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Compass,
  CookingPot,
  Croissant,
  DollarSign,
  EggFried,
  Eye,
  FileText,
  Flame,
  Globe,
  Heart,
  History,
  Hourglass,
  HouseHeart,
  IceCreamCone,
  ImagePlus,
  Leaf,
  LifeBuoy,
  Lock,
  LogOut,
  type LucideIcon,
  Mail,
  Map,
  MapPin,
  MessageSquareText,
  MessageSquareWarning,
  MilkOff,
  Minus,
  Moon,
  Pencil,
  Pin,
  Plus,
  Quote,
  ReceiptText,
  RotateCcw,
  Salad,
  Search,
  Share,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Smile,
  Sparkle,
  Sprout,
  Star,
  StarHalf,
  Store,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  UtensilsCrossed,
  Wheat,
  WheatOff,
  X,
  Zap,
} from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/theme';

import { CheckDisc, CrossDisc, Ring, Seal } from './glyphs';

/**
 * Manna's icon set: Lucide's thin-line icons at a 1.6 stroke, so every icon
 * shares one weight and corner style. Names are semantic (the keys below).
 * Only third-party brand marks (Google, Facebook, Apple, Instagram) come from elsewhere.
 */
const LUCIDE = {
  'account': User,
  'account-outline': User,
  'alert-circle-outline': CircleAlert,
  'alert-outline': TriangleAlert,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'barley-off': WheatOff,
  'bell-outline': Bell,
  'bell-ring-outline': BellRing,
  'bike-fast': Bike,
  'book-open-variant': BookOpen,
  'calendar-clock': CalendarClock,
  'camera-plus-outline': Camera,
  'cellphone': Smartphone,
  'check': Check,
  'check-circle': CircleCheck,
  'check-circle-outline': CircleCheck,
  'check-decagram': BadgeCheck,
  'check-decagram-outline': BadgeCheck,
  'checkbox-blank-circle-outline': Circle,
  'chef-hat': ChefHat,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chili-mild': Flame,
  'clock-outline': Clock,
  'close': X,
  'close-circle': CircleX,
  'close-circle-outline': CircleX,
  'compass': Compass,
  'compass-outline': Compass,
  'cooking-pot': CookingPot,
  'cow-off': MilkOff,
  'croissant': Croissant,
  'cupcake': Croissant,
  'currency-usd': DollarSign,
  'earth': Globe,
  'egg-fried': EggFried,
  'email-outline': Mail,
  'emoticon-happy-outline': Smile,
  'export-variant': Share,
  'eye-outline': Eye,
  'file-document-outline': FileText,
  'fire': Flame,
  'food-halal': BadgeCheck,
  'food-takeout-box': Salad,
  'format-quote-open': Quote,
  'heart': Heart,
  'heart-outline': Heart,
  'pin-outline': Pin,
  'history': History,
  'home-heart': HouseHeart,
  'ice-cream': IceCreamCone,
  'image-plus': ImagePlus,
  'leaf': Leaf,
  'lifebuoy': LifeBuoy,
  'lightning-bolt-outline': Zap,
  'lock-outline': Lock,
  'logout': LogOut,
  'delete-outline': Trash2,
  'magnify': Search,
  'map-marker': MapPin,
  'map-marker-outline': MapPin,
  'map-marker-radius': Map,
  'message-alert-outline': MessageSquareWarning,
  'message-text-outline': MessageSquareText,
  'minus': Minus,
  'moon-waning-crescent': Moon,
  'pencil-outline': Pencil,
  'plus': Plus,
  'pot-steam-outline': CookingPot,
  'progress-clock': Hourglass,
  'receipt-text': ReceiptText,
  'receipt-text-outline': ReceiptText,
  'replay': RotateCcw,
  'shield-lock-outline': ShieldCheck,
  'shopping': ShoppingBag,
  'shopping-outline': ShoppingBag,
  'silverware-variant': UtensilsCrossed,
  'sprout': Sprout,
  'wheat': Wheat,
  'star': Star,
  'star-four-points': Sparkle,
  'star-four-points-outline': Sparkle,
  'star-half-full': StarHalf,
  'star-outline': Star,
  'storefront-outline': Store,
  'timer-sand': Hourglass,
  'trash-can-outline': Trash2,
  'tune-variant': SlidersHorizontal,
  'upload': Upload,
  'weather-night': Moon,
} satisfies Record<string, LucideIcon>;

const BRANDS = ['google', 'facebook', 'apple', 'instagram'] as const;

export type IconName = keyof typeof LUCIDE | (typeof BRANDS)[number];

/** Drawn as a solid shape in the icon color. */
const SOLID = new Set<IconName>(['heart', 'star', 'star-half-full', 'star-four-points']);
/** Status glyphs drawn by Manna itself (./glyphs), not recolored stock icons. */
const CUSTOM = {
  'check-circle': CheckDisc,
  'close-circle': CrossDisc,
  'checkbox-blank-circle-outline': Ring,
  'check-decagram': Seal,
} as const;
/** Active tab icons: same shape, heavier stroke. */
const BOLD = new Set<IconName>(['account', 'compass', 'shopping', 'receipt-text']);

export function Icon({
  name,
  size = 20,
  color = colors.text,
  strokeWidth,
  style,
  accessibilityLabel,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  if ((BRANDS as readonly string[]).includes(name)) {
    return (
      <MaterialCommunityIcons
        name={name as (typeof BRANDS)[number]}
        size={size}
        color={color}
        style={style}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  if (name in CUSTOM) {
    const Custom = CUSTOM[name as keyof typeof CUSTOM];
    return <Custom size={size} color={color} markColor={colors.bg} style={style} accessibilityLabel={accessibilityLabel} />;
  }
  const Glyph = LUCIDE[name as keyof typeof LUCIDE];
  return (
    <Glyph
      size={size}
      color={color}
      fill={SOLID.has(name) ? color : 'none'}
      strokeWidth={strokeWidth ?? (BOLD.has(name) ? 2.1 : 1.6)}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
    />
  );
}
