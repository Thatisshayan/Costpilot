// Test-only: make money formatting independent of the machine's locale. Assertions are written
// for en-US ("$80.30"); a developer machine set to en-CA would otherwise print "US$80.30".
// Production code keeps using the viewer's own locale.
const NativeNumberFormat = Intl.NumberFormat;
const PinnedNumberFormat = function (locales?: string | string[], options?: Intl.NumberFormatOptions) {
  return new NativeNumberFormat(locales ?? "en-US", options);
} as unknown as typeof Intl.NumberFormat;
PinnedNumberFormat.supportedLocalesOf = NativeNumberFormat.supportedLocalesOf;
Intl.NumberFormat = PinnedNumberFormat;
