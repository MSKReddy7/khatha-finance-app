import dayjs from "dayjs";

/**
 * Formats a numeric amount to Indian Rupee (₹) format.
 */
export const formatCurrency = (amount: number): string => {
  const absAmount = Math.abs(amount);

  // Format currency according to Indian counting system if possible, or fallback
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(absAmount);

  return `₹${formatted}`;
};

/**
 * Returns formatted date string using Day.js
 */
export const formatDate = (
  dateString: string,
  pattern = "DD MMM YYYY",
): string => {
  if (!dateString) return "";
  return dayjs(dateString).format(pattern);
};

/**
 * Formats a transaction timeline date (e.g., "01 Jan 2026")
 */
export const formatTimelineDate = (dateString: string): string => {
  return formatDate(dateString, "DD MMM YYYY");
};

/**
 * Formats the balance label based on positive (Pending) or negative (Extra Received) amounts
 */
export const formatBalanceLabel = (
  balance: number,
  t: (key: string, options?: any) => string,
): { text: string; color: string } => {
  if (balance > 0) {
    return {
      text: `${formatCurrency(balance)} ${t("common.pending")}`,
      color: "gave", // red
    };
  } else if (balance < 0) {
    return {
      text: `${formatCurrency(balance)} ${t("common.extraReceived")}`,
      color: "received", // green
    };
  } else {
    return {
      text: "₹0",
      color: "text",
    };
  }
};
