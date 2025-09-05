import express, { Request, Response, Express } from "express";

/**
 * Interface representing a customer.
 */
interface Customer {
    id: number;
    name: string;
    status: "PLATINUM" | "GOLD" | "SILVER" | "BRONZE"; // ⬅️ added PLATINUM
    points: number;
    lastPurchaseDate: string;
    email?: string;
    preferredStore?: string;
    joinDate: string;
    notifications: boolean;
    lastStatusChange?: string;
}

const customers: Customer[] = [
    {
        id: 1,
        name: "John Smith",
        status: "SILVER",
        points: 450,
        lastPurchaseDate: "2024-02-15",
        joinDate: "2023-06-15",
        notifications: true,
        preferredStore: "Downtown",
    },
    {
        id: 2,
        name: "Jane Doe",
        status: "GOLD",
        points: 850,
        lastPurchaseDate: "2024-03-01",
        email: "jane.doe@email.com",
        joinDate: "2023-01-20",
        notifications: false,
    },
];

const app: Express = express();
app.use(express.json());

/** Base rule: 1 point per $10. */
const BASE_POINT_DIVISOR = 10;

/** Status multipliers (LOYALTY-245). */
const STATUS_MULTIPLIER: Record<Customer["status"], number> = {
  BRONZE: 1.0,
  SILVER: 1.0,
  GOLD: 1.2,      // GOLD earns 1.2x
  PLATINUM: 2.0,  // PLATINUM earns 2x
};

/** Calculate awarded points using ONLY status multiplier (no purchase bonus here). */
function calcPointsWithStatus(status: Customer["status"], amount: number): number {
  const base = Math.floor(amount / BASE_POINT_DIVISOR);
  const mult = STATUS_MULTIPLIER[status] ?? 1.0;
  return Math.floor(base * mult);
}

/** Apply automatic status upgrades based on thresholds. */
function applyStatusUpgrade(c: Customer): void {
  // Thresholds: PLATINUM >= 1000, GOLD >= 750, SILVER >= 500
  const prev = c.status;
  if (c.points >= 1000 && c.status !== "PLATINUM") {
    c.status = "PLATINUM";
    c.lastStatusChange = new Date().toISOString();
  } else if (c.points >= 750 && (c.status === "SILVER" || c.status === "BRONZE")) {
    c.status = "GOLD";
    c.lastStatusChange = new Date().toISOString();
  } else if (c.points >= 500 && c.status === "BRONZE") {
    c.status = "SILVER";
    c.lastStatusChange = new Date().toISOString();
  }
  // Note: we do not implement demotions here. The “GOLD keeps status for 30 days” is
  // satisfied because we never downgrade on purchases in this service.
}

/**
 * GET /api/customers/:id – retrieve a customer by ID.
 */
app.get("/api/customers/:id", (req: Request, res: Response): void => {
  const customerId = parseInt(req.params.id);
  const customer = customers.find((c) => c.id === customerId);
  if (customer) res.json(customer);
  else res.status(404).send("Customer not found");
});

/**
 * POST /api/customers/:id/purchase – record a purchase and award points (Ticket #1 logic only).
 * Body: { "amount": number, "storeLocation"?: string }
 */
app.post("/api/customers/:id/purchase", (req: Request, res: Response): void => {
  const customerId = parseInt(req.params.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    res.status(404).send("Customer not found");
    return;
  }

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).send("Invalid 'amount' provided. Must be a positive number.");
    return;
  }

  // Award points using ONLY status multiplier (no purchase bonus in Ticket #1)
  const awardedPoints = calcPointsWithStatus(customer.status, amount);
  customer.points += awardedPoints;
  customer.lastPurchaseDate = new Date().toISOString();

  // Upgrade status if thresholds met
  applyStatusUpgrade(customer);

  res.json({
    customer,
    awardedPoints,
    appliedStatusMultiplier: STATUS_MULTIPLIER[customer.status],
  });
});

/**
 * PATCH /api/customers/:id/preferences – update preferences.
 */
app.patch("/api/customers/:id/preferences", (req: Request, res: Response): void => {
  const customerId = parseInt(req.params.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    res.status(404).send("Customer not found");
    return;
  }

  if (typeof req.body.notifications === "boolean") {
    customer.notifications = req.body.notifications;
  }
  if (typeof req.body.preferredStore === "string") {
    customer.preferredStore = req.body.preferredStore;
  }
  if (typeof req.body.email === "string") {
    customer.email = req.body.email;
  }

  res.json(customer);
});

export default app;