import { useMemo } from "react";
import { DATE_PRESETS, getPresetRange, matchPreset } from "./dateRangePresets.js";

function DateRangePresetChips({ dateFrom, dateTo, onApply, presets = DATE_PRESETS }) {
  const activeKey = useMemo(() => matchPreset(dateFrom, dateTo), [dateFrom, dateTo]);

  return (
    <div className="date-preset-row" role="group" aria-label="Quick date ranges">
      {presets.map((preset) => {
        const isActive = preset.key === activeKey;
        return (
          <button
            aria-pressed={isActive}
            className={`date-preset-chip${isActive ? " is-active" : ""}`}
            key={preset.key}
            onClick={() => onApply(getPresetRange(preset.key))}
            type="button"
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

export default DateRangePresetChips;
