import { MockPosApi } from "./adapter";
import { resetMockState } from "./store";
import { OperatorSessionError, PinInvalidError } from "../errors";
import { loadMockState, saveMockState } from "./store";
import { pairForTest } from "@/test/utils";

beforeEach(() => resetMockState());

test("mock operator unlock is name-first, locks, and never survives an adapter reload", async () => {
  const api = new MockPosApi({ latencyMs: 0 });
  await pairForTest(api);
  const roster = await api.listOperators();
  expect(roster[0]).toMatchObject({ name: "Maria Reyes", role: "owner", requiresSetup: false });
  await expect(api.unlockOperator(roster[0].userId, "000000")).rejects.toBeInstanceOf(PinInvalidError);
  const unlocked = await api.unlockOperator(roster[0].userId, "123456");
  expect(unlocked.operator.userId).toBe(roster[0].userId);
  await expect(api.currentOperator()).resolves.toMatchObject({ userId: roster[0].userId });
  const reloaded = new MockPosApi({ latencyMs: 0 });
  await expect(reloaded.currentOperator()).rejects.toBeInstanceOf(OperatorSessionError);
  await api.lockOperator();
  await expect(api.currentOperator()).rejects.toBeInstanceOf(OperatorSessionError);
});

test("mock cashier first setup, owner-only drawer resume, approval and revocation mirror HTTP behavior", async () => {
  const api = new MockPosApi({ latencyMs: 0 });
  await pairForTest(api);
  const roster = await api.listOperators();
  expect(roster).toEqual(expect.arrayContaining([
    expect.objectContaining({ userId: "mock-manager", role: "manager", requiresSetup: false }),
    expect.objectContaining({ userId: "mock-cashier", role: "cashier", requiresSetup: true }),
  ]));
  await expect(api.setupOperatorPin("mock-cashier", "112233", "112233")).rejects.toThrow(/different/i);
  await api.setupOperatorPin("mock-cashier", "112233", "445566");
  const shift = await api.openShift(1000);
  expect(shift.operatorUserId).toBe("mock-cashier");
  await api.lockOperator();
  await expect(api.openShift(1000)).rejects.toBeInstanceOf(OperatorSessionError);
  await expect(api.unlockOperator("mock-owner", "123456")).rejects.toThrow(/original operator/i);
  await api.unlockOperator("mock-cashier", "445566");
  const input = { productId: "prod-pandesal", variantId: null, newQty: 3, reasonCategory: "count_correction" as const, note: null };
  await expect(api.adjustStock(input)).rejects.toThrow(/approval/i);
  await api.adjustStock({ ...input, approval: { approverUserId: "mock-manager", pin: "654321" } });
  expect(await api.currentOperator()).toMatchObject({ userId: "mock-cashier" });
  const state = loadMockState();
  state.staff.find((person) => person.userId === "mock-cashier")!.active = false;
  saveMockState(state);
  await expect(api.addCashMovement({ type: "in", amountC: 100, reason: "Top-up" })).rejects.toBeInstanceOf(OperatorSessionError);
  const z = await api.emergencyCloseShift({ countedCashC: 900, reason: "Cashier deactivated", approval: { approverUserId: "mock-owner", pin: "123456" } });
  expect(z).toMatchObject({ operatorUserId: "mock-cashier", closedByUserId: "mock-owner", overShortC: -100 });
});
