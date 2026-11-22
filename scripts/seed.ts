/**
 * Seed de demonstração (SPEC §9). Idempotente: usa ids fixos + upsert, pode rodar quantas vezes quiser.
 * Rodar de novo também "reinicia a demo": o pedido pendente da Bia volta para `requested`.
 *
 *   npm.cmd run seed
 *
 * Usa a service role (só aqui e no servidor; nunca no client).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/db";
import { addDays, addMonths, monthKey, nextWeekFriday, todayISO } from "../src/lib/dates";
import { offsetMeters } from "../src/lib/geo";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: usa as variáveis já presentes no ambiente
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD;
if (!url || !serviceKey || !password) {
  console.error(
    "Faltam variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SEED_PASSWORD (veja .env.example).",
  );
  process.exit(1);
}

const db = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Tables = Database["public"]["Tables"];
type BookingInsert = Tables["bookings"]["Insert"];
type ReviewInsert = Tables["reviews"]["Insert"];

const BUBBLE_ID = "00000000-0000-4000-8000-000000000001";
const CENTER = { lat: -23.5614, lng: -46.723 };

const id = (prefix: string, n: number) =>
  `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function check<R extends { data: unknown; error: { message: string } | null }>(
  label: string,
  res: R,
): Extract<R, { error: null }>["data"] {
  if (res.error) {
    console.error(`✗ ${label}: ${res.error.message}`);
    process.exit(1);
  }
  return res.data as Extract<R, { error: null }>["data"];
}

// ───────────── Contas ─────────────

const ACCOUNTS = [
  { key: "lucas", email: "lucas@rumo.test", name: "Lucas Yokoyama", phone: "(11) 98888-0001" },
  { key: "ana", email: "ana@rumo.test", name: "Ana Paula Ribeiro", phone: "(11) 98888-0002" },
  { key: "bia", email: "bia@rumo.test", name: "Beatriz Lima", phone: "(11) 98888-0003" },
  { key: "mariana", email: "mariana@rumo.test", name: "Mariana Souza", phone: "(11) 98888-0004" },
  { key: "rafael", email: "rafael@rumo.test", name: "Rafael Tanaka", phone: "(11) 98888-0005" },
  { key: "carlos", email: "carlos@rumo.test", name: "Carlos Mendes", phone: "(11) 98888-0006" },
  { key: "juliana", email: "juliana@rumo.test", name: "Juliana Rocha", phone: "(11) 98888-0007" },
  { key: "eduardo", email: "eduardo@rumo.test", name: "Eduardo Kato", phone: "(11) 98888-0008" },
] as const;
type AccountKey = (typeof ACCOUNTS)[number]["key"];

async function seedAccounts(): Promise<Record<AccountKey, string>> {
  const existing = check("listar usuários", await db.auth.admin.listUsers({ perPage: 1000 }));
  const byEmail = new Map(existing.users.map((u) => [u.email, u.id]));
  const ids = {} as Record<AccountKey, string>;

  for (const acc of ACCOUNTS) {
    let userId = byEmail.get(acc.email);
    if (userId) {
      check(
        `atualizar ${acc.email}`,
        await db.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { full_name: acc.name },
        }),
      );
    } else {
      const created = check(
        `criar ${acc.email}`,
        await db.auth.admin.createUser({
          email: acc.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: acc.name },
        }),
      );
      userId = created.user.id;
    }
    ids[acc.key] = userId;
    check(
      `perfil ${acc.email}`,
      await db
        .from("profiles")
        .upsert({
          id: userId,
          full_name: acc.name,
          phone: acc.phone,
          verified: true,
          bubble_id: BUBBLE_ID,
        }),
    );
  }
  return ids;
}

// ───────────── Carros ─────────────

type CarSeed = {
  n: number;
  slug: string;
  owner: AccountKey;
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  category: Database["public"]["Enums"]["car_category"];
  transmission: Database["public"]["Enums"]["transmission"];
  price: number; // R$/dia
  meters: number; // distância do centro da bolha
  bearing: number;
  address: string;
  description: string;
  ratings: number[]; // notas das avaliações (uma por aluguel concluído)
  costs?: [ipva: number, insurance: number, maintenance: number, depreciation: number];
};

const fives = (n: number) => Array<number>(n).fill(5);

const CARS: CarSeed[] = [
  { n: 1, slug: "onix", owner: "mariana", make: "Chevrolet", model: "Onix", year: 2022, color: "Vermelho", plate: "RUM-1A22", category: "economy", transmission: "manual", price: 119, meters: 170, bearing: 40, address: "Av. Prof. Luciano Gualberto, 380", description: "O mais alugado da bolha. Econômico, som com Bluetooth e porta-malas bom para mudança pequena.", ratings: [...fives(9), 4] },
  { n: 2, slug: "hb20", owner: "rafael", make: "Hyundai", model: "HB20", year: 2021, color: "Prata", plate: "RUM-2B21", category: "economy", transmission: "manual", price: 109, meters: 290, bearing: 250, address: "R. Alvarenga, 1200", description: "Revisado, pneus novos. Ótimo para pegar estrada no fim de semana.", ratings: [...fives(8), 4, 4] },
  { n: 3, slug: "kwid", owner: "ana", make: "Renault", model: "Kwid", year: 2023, color: "Amarelo", plate: "RUM-3C23", category: "economy", transmission: "manual", price: 89, meters: 110, bearing: 200, address: "R. do Matão, garagem 2", description: "Pequeno, fácil de estacionar e muito econômico. Fica na garagem ao lado do IME.", ratings: [...fives(9), 4] },
  { n: 4, slug: "polo", owner: "carlos", make: "Volkswagen", model: "Polo", year: 2022, color: "Azul", plate: "RUM-4D22", category: "economy", transmission: "automatic", price: 139, meters: 350, bearing: 110, address: "Av. Corifeu de Azevedo Marques, 250", description: "Automático, confortável e com piloto automático. Perfeito para viagem.", ratings: [...fives(9), 4] },
  { n: 5, slug: "tcross", owner: "juliana", make: "Volkswagen", model: "T-Cross", year: 2023, color: "Preto", plate: "RUM-5E23", category: "suv", transmission: "automatic", price: 189, meters: 470, bearing: 20, address: "R. Camargo, 88", description: "SUV automático, espaço de sobra para cinco pessoas e bagagem.", ratings: fives(6) },
  { n: 6, slug: "mobi", owner: "ana", make: "Fiat", model: "Mobi", year: 2020, color: "Branco", plate: "RUM-6F20", category: "economy", transmission: "manual", price: 79, meters: 230, bearing: 310, address: "Av. Afrânio Peixoto, 412", description: "O mais barato da bolha. Ideal para resolver coisas pela cidade.", ratings: [...fives(7), 4, 4, 4] },
  { n: 7, slug: "corolla", owner: "eduardo", make: "Toyota", model: "Corolla", year: 2021, color: "Cinza", plate: "RUM-7G21", category: "sedan", transmission: "automatic", price: 219, meters: 530, bearing: 215, address: "R. Pirajussara, 51", description: "Sedan automático, bancos de couro. Para quando a ocasião pede conforto.", ratings: [...fives(9), 4] },
  { n: 8, slug: "argo", owner: "lucas", make: "Fiat", model: "Argo", year: 2021, color: "Verde", plate: "FAB-2C21", category: "economy", transmission: "manual", price: 119, meters: 200, bearing: 150, address: "R. Catequese, 77", description: "Meu Argo fica parado durante a semana. Cuidado como se fosse seu!", ratings: [], costs: [2100, 3400, 1800, 6500] },
];

const COMMENTS = [
  "Carro limpo e entrega super tranquila. Recomendo!",
  "Tudo certo, combinamos a retirada em cinco minutos.",
  "Muito mais barato que locadora e pertinho de casa.",
  "Carro bem cuidado e econômico. Alugaria de novo.",
  "Retirada rápida, a vistoria por fotos dá segurança.",
  "Salvou meu fim de semana. Proprietário muito atencioso.",
  "Exatamente como no anúncio. Voltarei a alugar.",
  "Processo simples, sem burocracia nenhuma.",
  "Ótimo custo-benefício para viagem curta.",
  "Carro em bom estado, só o tanque veio pela metade.",
];

async function seedCars(users: Record<AccountKey, string>) {
  for (const c of CARS) {
    const pos = offsetMeters(CENTER, c.meters, c.bearing);
    const [ipva, insurance, maintenance, depreciation] = c.costs ?? [
      Math.round(c.price * 16),
      Math.round(c.price * 26),
      Math.round(c.price * 14),
      Math.round(c.price * 50),
    ];
    check(
      `carro ${c.model}`,
      await db.from("cars").upsert({
        id: id("c", c.n),
        owner_id: users[c.owner],
        bubble_id: BUBBLE_ID,
        make: c.make,
        model: c.model,
        year: c.year,
        color: c.color,
        plate: c.plate,
        category: c.category,
        transmission: c.transmission,
        seats: 5,
        price_per_day_cents: c.price * 100,
        lat: pos.lat,
        lng: pos.lng,
        pickup_address: c.address,
        available_weekdays: [0, 1, 2, 3, 4, 5, 6],
        annual_ipva_cents: ipva * 100,
        annual_insurance_cents: insurance * 100,
        annual_maintenance_cents: maintenance * 100,
        annual_depreciation_cents: depreciation * 100,
        is_listed: true,
        description: c.description,
      }),
    );
    check(
      `fotos ${c.model}`,
      await db.from("car_photos").upsert([
        { id: id("f", c.n * 10 + 1), car_id: id("c", c.n), url: `/cars/${c.slug}-1.svg`, position: 0 },
        { id: id("f", c.n * 10 + 2), car_id: id("c", c.n), url: `/cars/${c.slug}-2.svg`, position: 1 },
      ]),
    );
  }
}

// ───────────── Reservas e avaliações ─────────────

const today = todayISO();
/** Meio-dia em São Paulo (UTC−3) do dia informado. */
const at = (day: string, hour = 12) => `${day}T${String(hour).padStart(2, "0")}:00:00-03:00`;

function completedBooking(args: {
  n: number;
  carN: number;
  renter: string;
  end: string;
  days: number;
  pricePerDayCents: number;
  payoutCents?: number;
}): BookingInsert {
  const start = addDays(args.end, -(args.days - 1));
  const subtotal =
    args.payoutCents !== undefined
      ? Math.round(args.payoutCents / 0.85)
      : args.days * args.pricePerDayCents;
  const fee = Math.round(subtotal / 1000) * 100;
  return {
    id: id("b", args.n),
    car_id: id("c", args.carN),
    renter_id: args.renter,
    start_date: start,
    end_date: args.end,
    protection: "basic",
    days: args.days,
    subtotal_cents: subtotal,
    protection_cents: 0,
    service_fee_cents: fee,
    total_cents: subtotal + fee,
    owner_payout_cents: args.payoutCents ?? Math.round(subtotal * 0.85),
    payment_method: "pix",
    payment_status: "paid",
    status: "completed",
    pickup_code: String(1000 + ((args.n * 7919) % 9000)),
    requested_at: at(addDays(start, -3), 10),
    accepted_at: at(addDays(start, -3), 11),
    pickup_confirmed_at: at(start, 9),
    started_at: at(start, 9),
    completed_at: at(args.end, 18),
    closed_at: at(args.end, 18),
  };
}

async function seedBookings(users: Record<AccountKey, string>) {
  const bookings: BookingInsert[] = [];
  const reviews: ReviewInsert[] = [];
  let n = 0;

  const addReviews = (b: BookingInsert, ownerId: string, rating: number) => {
    const num = Number(b.id!.slice(-12));
    reviews.push(
      {
        id: id("e", num * 2),
        booking_id: b.id!,
        author_id: b.renter_id,
        target_id: ownerId,
        rating,
        comment: rating === 5 ? COMMENTS[num % 9] : COMMENTS[9],
        created_at: b.completed_at!,
      },
      {
        id: id("e", num * 2 + 1),
        booking_id: b.id!,
        author_id: ownerId,
        target_id: b.renter_id,
        rating: 5,
        comment: "Devolveu o carro no horário e do jeito que pegou.",
        created_at: b.completed_at!,
      },
    );
  };

  // 1) Histórico dos 7 carros do protótipo: um aluguel concluído por avaliação.
  const renterPool: AccountKey[] = ["bia", "rafael", "mariana", "carlos", "juliana", "eduardo", "ana"];
  for (const car of CARS.filter((c) => c.ratings.length)) {
    car.ratings.forEach((rating, i) => {
      n += 1;
      let renterKey = renterPool[(i + car.n) % renterPool.length];
      if (renterKey === car.owner) renterKey = "bia";
      // Lucas já alugou o HB20 e o Onix (aba "Anteriores").
      if ((car.slug === "hb20" || car.slug === "onix") && i === 0) renterKey = "lucas";
      const end = addDays(today, -(12 + i * 9 + car.n));
      const b = completedBooking({
        n,
        carN: car.n,
        renter: users[renterKey],
        end,
        days: 1 + ((i + car.n) % 3),
        pricePerDayCents: car.price * 100,
      });
      bookings.push(b);
      addReviews(b, users[car.owner], rating);
    });
  }

  // 2) Argo do Lucas: repasses dos últimos 6 meses (o último no mês corrente) para o gráfico do "Ganhar".
  const PAYOUTS = [420, 610, 880, 940, 1210, 1382];
  const thisMonth = monthKey(new Date());
  const dayOfMonth = Number(today.slice(8, 10));
  const argoRenters: AccountKey[] = ["bia", "rafael", "mariana", "carlos", "juliana", "eduardo"];
  n = 500;
  PAYOUTS.forEach((payout, i) => {
    const month = addMonths(thisMonth, i - (PAYOUTS.length - 1));
    const isCurrent = month === thisMonth;
    const first = Math.round(payout * 0.45);
    const parts = [first, payout - first];
    parts.forEach((part, j) => {
      n += 1;
      const wantedDay = j === 0 ? 10 : 22;
      const day = isCurrent ? Math.min(wantedDay, dayOfMonth) : wantedDay;
      const end = `${month}-${String(day).padStart(2, "0")}`;
      const b = completedBooking({
        n,
        carN: 8,
        renter: users[argoRenters[(i + j) % argoRenters.length]],
        end,
        days: Math.max(1, Math.round(part / 85 / 1.19)),
        pricePerDayCents: 11900,
        payoutCents: part * 100,
      });
      // concluído sempre dentro do mês de referência (e nunca no futuro)
      b.completed_at = isCurrent && day === dayOfMonth ? new Date(Date.now() - (2 - j) * 3_600_000).toISOString() : at(end, 18);
      b.closed_at = b.completed_at;
      bookings.push(b);
      addReviews(b, users.lucas, j === 1 && i === 2 ? 4 : 5);
    });
  });

  // 3) Pedido pendente da Bia no Argo do Lucas: sexta → domingo da semana que vem.
  const friday = nextWeekFriday(today);
  const pendingId = id("b", 900);
  const subtotal = 3 * 11900;
  const fee = Math.round(subtotal / 1000) * 100;
  const pending: BookingInsert = {
    id: pendingId,
    car_id: id("c", 8),
    renter_id: users.bia,
    start_date: friday,
    end_date: addDays(friday, 2),
    protection: "basic",
    days: 3,
    subtotal_cents: subtotal,
    protection_cents: 0,
    service_fee_cents: fee,
    total_cents: subtotal + fee,
    owner_payout_cents: Math.round(subtotal * 0.85),
    payment_method: "pix",
    payment_status: "paid",
    status: "requested",
    pickup_code: null,
    pickup_confirmed_at: null,
    requested_at: new Date().toISOString(),
    accepted_at: null,
    started_at: null,
    completed_at: null,
    closed_at: null,
  };

  // Reinicia a demo: limpa vistoria/avaliações do pedido pendente e libera as datas dele.
  check("limpar vistoria", await db.from("inspection_photos").delete().eq("booking_id", pendingId));
  check("limpar avaliações", await db.from("reviews").delete().eq("booking_id", pendingId));
  check(
    "liberar datas do pedido pendente",
    await db
      .from("bookings")
      .update({ status: "cancelled", payment_status: "refunded", closed_at: new Date().toISOString() })
      .eq("car_id", id("c", 8))
      .neq("id", pendingId)
      .in("status", ["requested", "accepted", "active"])
      .lte("start_date", pending.end_date)
      .gte("end_date", pending.start_date),
  );

  check("reservas", await db.from("bookings").upsert([...bookings, pending]));
  check("avaliações", await db.from("reviews").upsert(reviews));
  return { bookings: bookings.length + 1, reviews: reviews.length, friday };
}

async function main() {
  console.log(`Seed em ${url}`);
  check(
    "bolha",
    await db.from("bubbles").upsert({
      id: BUBBLE_ID,
      name: "Butantã",
      center_lat: CENTER.lat,
      center_lng: CENTER.lng,
      radius_m: 1500,
    }),
  );
  const users = await seedAccounts();
  await seedCars(users);
  const stats = await seedBookings(users);

  const count = async (table: "cars" | "bookings" | "reviews" | "profiles") =>
    (await db.from(table).select("*", { count: "exact", head: true })).count;
  console.log(
    `✓ contas: ${ACCOUNTS.length} (seed) · profiles: ${await count("profiles")} · cars: ${await count("cars")} · bookings: ${await count("bookings")} · reviews: ${await count("reviews")}`,
  );
  console.log(`✓ pedido pendente da Bia no Argo: ${stats.friday} → ${addDays(stats.friday, 2)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
