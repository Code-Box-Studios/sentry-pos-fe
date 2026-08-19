import { setApiForTests } from "@/api";
import { MockPosApi } from "@/api/mock/adapter";
import { resetMockState } from "@/api/mock/store";
import { pairForTest } from "@/test/utils";
import { useShiftStore } from "./shift";

beforeEach(async () => {
  resetMockState();
  const api = new MockPosApi({ latencyMs: 0 });
  setApiForTests(api);
  await pairForTest(api);
  useShiftStore.setState({ shift: null, hydrated: false });
});

afterEach(() => setApiForTests(null));

test("opening a shift puts it in the store", async () => {
  await useShiftStore.getState().open(200000);
  const { shift } = useShiftStore.getState();
  expect(shift).not.toBeNull();
  expect(shift!.openingCashC).toBe(200000);
  expect(shift!.closedAt).toBeNull();
});

test("load() recovers the open shift after a store reset — the server owns it, not the client", async () => {
  await useShiftStore.getState().open(50000);
  const openedId = useShiftStore.getState().shift!.id;

  useShiftStore.getState().reset();
  expect(useShiftStore.getState().shift).toBeNull();
  expect(useShiftStore.getState().hydrated).toBe(false);

  await useShiftStore.getState().load();
  expect(useShiftStore.getState().shift?.id).toBe(openedId);
  expect(useShiftStore.getState().hydrated).toBe(true);
});

test("cash movements land on the open shift", async () => {
  await useShiftStore.getState().open(200000);
  await useShiftStore.getState().addCashMovement("in", 100000, "change fund from safe");
  await useShiftStore.getState().addCashMovement("out", 75000, "LPG delivery paid from drawer");
  const movements = useShiftStore.getState().shift!.cashMovements;
  expect(movements.map((m) => m.type)).toEqual(["in", "out"]);
  expect(movements.map((m) => m.amountC)).toEqual([100000, 75000]);
});

test("closing clears the shift and returns the Z report", async () => {
  await useShiftStore.getState().open(200000);
  const z = await useShiftStore.getState().close(200000);
  expect(z.overShortC).toBe(0);
  expect(z.terminalCode).toBe("T1");
  expect(z.branchCode).toBe("MKT");
  expect(useShiftStore.getState().shift).toBeNull();
});
