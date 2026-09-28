import {
  buildReadDataByIdentifier,
  parseDriverMinutesDid,
  parseDriverWorkingState,
  RHMI_DIDS,
} from "./tacho-rhmi.js";

const toSeconds = (parsed) => parsed.valid ? parsed.minutes * 60 : null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readWorkingState(sendUds, timeoutMs, sleepImpl) {
  let parsed = parseDriverWorkingState(await sendUds(
    buildReadDataByIdentifier(RHMI_DIDS.DRIVER_1_WORKING_STATE),
    timeoutMs,
  ) ?? []);

  // A retained BLE session can occasionally yield one stale/incomplete F903
  // frame immediately after setup. Retry only that read before declaring the
  // activity unavailable; the transport and all other DID reads stay intact.
  if (!parsed.valid) {
    await sleepImpl(350);
    parsed = parseDriverWorkingState(await sendUds(
      buildReadDataByIdentifier(RHMI_DIDS.DRIVER_1_WORKING_STATE),
      timeoutMs,
    ) ?? []);
  }
  return parsed;
}

async function readMinutesDid(sendUds, did, timeoutMs) {
  const response = await sendUds(buildReadDataByIdentifier(did), timeoutMs);
  return parseDriverMinutesDid(response ?? [], did);
}

export async function readCoreDriverTelemetry(
  sendUds,
  timeoutMs = 2000,
  { interDidDelayMs = 350, sleepImpl = sleep } = {},
) {
  const pauseBetweenReads = async () => {
    if (interDidDelayMs > 0) await sleepImpl(interDidDelayMs);
  };

  const working = await readWorkingState(sendUds, timeoutMs, sleepImpl);
  await pauseBetweenReads();

  const continuous = await readMinutesDid(
    sendUds,
    RHMI_DIDS.DRIVER_1_CONTINUOUS_DRIVING,
    timeoutMs,
  );
  await pauseBetweenReads();
  const breakTime = await readMinutesDid(
    sendUds,
    RHMI_DIDS.DRIVER_1_CUMULATIVE_BREAK,
    timeoutMs,
  );
  await pauseBetweenReads();

  // F99A/F99B are optional capabilities. Invalid/unsupported responses remain null
  // and must not invalidate the mandatory core values above.
  const daily = await readMinutesDid(
    sendUds,
    RHMI_DIDS.DRIVER_1_CURRENT_DAILY_DRIVING,
    timeoutMs,
  );
  await pauseBetweenReads();
  const weekly = await readMinutesDid(
    sendUds,
    RHMI_DIDS.DRIVER_1_CURRENT_WEEKLY_DRIVING,
    timeoutMs,
  );

  return Object.freeze({
    activity: working.valid ? working.activity : "unknown",
    activityValid: working.valid,
    continuousDrivingSeconds: toSeconds(continuous),
    cumulativeBreakSeconds: toSeconds(breakTime),
    dailyDrivingSeconds: toSeconds(daily),
    weeklyDrivingSeconds: toSeconds(weekly),
    capabilities: Object.freeze({
      dailyDriving: daily.valid,
      weeklyDriving: weekly.valid,
    }),
  });
}
