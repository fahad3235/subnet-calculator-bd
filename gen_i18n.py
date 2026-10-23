#!/usr/bin/env python3
"""Generate js/i18n.js from this UTF-8 source dict as pure-ASCII JS
(Bengali as \\uXXXX escapes). Run: python3 gen_i18n.py"""
import json, os

STR = {
  "en": {
    "title": "Subnet Calculator BD",
    "tagline": "IPv4 subnetting, fully offline",
    "tab_calc": "Calculator",
    "tab_split": "Splitter",
    "tab_checks": "IP Checks",
    "calc_heading": "CIDR Calculator",
    "cidr_label": "IPv4 address + prefix (e.g. 192.168.1.10/24)",
    "cidr_placeholder": "192.168.1.10/24",
    "prefix_label": "Prefix length",
    "compute_btn": "Compute subnet",
    "sample_btn": "Try sample",
    "clear_btn": "Clear",
    "empty_calc": "Enter an address like 192.168.1.10/24 and press Compute.",
    "r_network": "Network address",
    "r_broadcast": "Broadcast address",
    "r_mask": "Subnet mask",
    "r_wildcard": "Wildcard mask",
    "r_total": "Total addresses",
    "r_usable": "Usable hosts",
    "r_first": "First usable host",
    "r_last": "Last usable host",
    "r_binary": "Binary view",
    "r_class": "IP class info",
    "r_note_rfc3021": "Note: /31 uses both addresses (RFC 3021 point-to-point).",
    "r_note_host": "Note: /32 is a single host route.",
    "copy_btn": "Copy results",
    "copied": "Copied!",
    "split_heading": "Subnet Splitter",
    "split_net_label": "Network (CIDR), e.g. 192.168.0.0/24",
    "split_mode_label": "Split by",
    "split_mode_count": "Number of subnets",
    "split_mode_prefix": "New prefix length",
    "split_count_label": "Subnets wanted",
    "split_prefix_label": "New prefix",
    "split_btn": "Split",
    "empty_split": "Enter a network and choose how to split it.",
    "split_capped": "Showing first 256 of {n} subnets.",
    "c_network": "Network",
    "c_first": "First host",
    "c_last": "Last host",
    "c_broadcast": "Broadcast",
    "checks_heading": "IP Address Checks",
    "checks_label": "IPv4 address to inspect",
    "checks_btn": "Check address",
    "empty_checks": "Enter an IPv4 address to classify it.",
    "tag_PRIVATE": "Private (not routable on the internet)",
    "tag_PUBLIC": "Public (globally routable)",
    "tag_LOOPBACK": "Loopback (this device)",
    "tag_LINK_LOCAL": "Link-local (same network only)",
    "tag_MULTICAST": "Multicast (group address)",
    "tag_RESERVED": "Reserved (Class E)",
    "tag_CGNAT": "Shared address space (CGNAT)",
    "tag_UNSPECIFIED": "Unspecified address",
    "legacy_class": "Legacy class",
    "default_mask": "Default (classful) prefix",
    "binary_view": "Binary",
    "err": {
      "E_NOT_STRING": "Invalid input.",
      "E_EMPTY": "Please enter a value.",
      "E_OCTET_COUNT": "An IPv4 address needs exactly 4 octets.",
      "E_BAD_OCTET": "Octets must contain only digits 0-9.",
      "E_OCTET_RANGE": "Each octet must be 0-255.",
      "E_LEADING_ZERO": "Octets may not have leading zeros (e.g. 01).",
      "E_BAD_PREFIX": "Prefix must be digits only.",
      "E_PREFIX_RANGE": "Prefix must be 0-32.",
      "E_CIDR_FORMAT": "Use the form address/prefix, e.g. 10.0.0.5/8.",
      "E_SPLIT_COUNT": "Subnet count must be a whole number from 1 to 65536.",
      "E_SPLIT_TOO_MANY": "That many subnets would need a prefix longer than /32.",
      "E_SPLIT_PREFIX": "New prefix must be between the network prefix and 32."
    },
    "lang_toggle": "বাংলা",
    "offline_note": "100% offline — nothing you type ever leaves this page.",
    "footer": "Built as a personal offline networking tool. Subnet math follows standard IPv4 rules."
  },
  "bn": {
    "title": "সাবনেট ক্যালকুলেটর বিডি",
    "tagline": "IPv4 সাবনেটিং, সম্পূর্ণ অফলাইন",
    "tab_calc": "ক্যালকুলেটর",
    "tab_split": "স্প্লিটার",
    "tab_checks": "আইপি পরীক্ষা",
    "calc_heading": "CIDR ক্যালকুলেটর",
    "cidr_label": "IPv4 ঠিকানা + প্রিফিক্স (যেমন 192.168.1.10/24)",
    "cidr_placeholder": "192.168.1.10/24",
    "prefix_label": "প্রিফিক্স দৈর্ঘ্য",
    "compute_btn": "সাবনেট হিসাব করুন",
    "sample_btn": "নমুনা দেখুন",
    "clear_btn": "মুছুন",
    "empty_calc": "192.168.1.10/24-এর মতো ঠিকানা লিখে হিসাব চাপুন।",
    "r_network": "নেটওয়ার্ক ঠিকানা",
    "r_broadcast": "ব্রডকাস্ট ঠিকানা",
    "r_mask": "সাবনেট মাস্ক",
    "r_wildcard": "ওয়াইল্ডকার্ড মাস্ক",
    "r_total": "মোট ঠিকানা",
    "r_usable": "ব্যবহারযোগ্য হোস্ট",
    "r_first": "প্রথম ব্যবহারযোগ্য হোস্ট",
    "r_last": "শেষ ব্যবহারযোগ্য হোস্ট",
    "r_binary": "বাইনারি রূপ",
    "r_class": "আইপি শ্রেণি তথ্য",
    "r_note_rfc3021": "নোট: /31-এ দুটি ঠিকানাই ব্যবহার হয় (RFC 3021 পয়েন্ট-টু-পয়েন্ট)।",
    "r_note_host": "নোট: /32 একটি একক হোস্ট রুট।",
    "copy_btn": "ফলাফল কপি করুন",
    "copied": "কপি হয়েছে!",
    "split_heading": "সাবনেট স্প্লিটার",
    "split_net_label": "নেটওয়ার্ক (CIDR), যেমন 192.168.0.0/24",
    "split_mode_label": "ভাগ করুন",
    "split_mode_count": "সাবনেট সংখ্যা",
    "split_mode_prefix": "নতুন প্রিফিক্স দৈর্ঘ্য",
    "split_count_label": "কাঙ্ক্ষিত সাবনেট",
    "split_prefix_label": "নতুন প্রিফিক্স",
    "split_btn": "ভাগ করুন",
    "empty_split": "একটি নেটওয়ার্ক লিখুন এবং কীভাবে ভাগ করবেন বেছে নিন।",
    "split_capped": "{n}টি সাবনেটের মধ্যে প্রথম ২৫৬টি দেখানো হচ্ছে।",
    "c_network": "নেটওয়ার্ক",
    "c_first": "প্রথম হোস্ট",
    "c_last": "শেষ হোস্ট",
    "c_broadcast": "ব্রডকাস্ট",
    "checks_heading": "আইপি ঠিকানা পরীক্ষা",
    "checks_label": "পরীক্ষা করার IPv4 ঠিকানা",
    "checks_btn": "ঠিকানা পরীক্ষা করুন",
    "empty_checks": "শ্রেণি জানতে একটি IPv4 ঠিকানা লিখুন।",
    "tag_PRIVATE": "প্রাইভেট (ইন্টারনেটে রাউট হয় না)",
    "tag_PUBLIC": "পাবলিক (বিশ্বব্যাপী রাউটযোগ্য)",
    "tag_LOOPBACK": "লুপব্যাক (এই ডিভাইস)",
    "tag_LINK_LOCAL": "লিংক-লোকাল (একই নেটওয়ার্কে সীমাবদ্ধ)",
    "tag_MULTICAST": "মাল্টিকাস্ট (গ্রুপ ঠিকানা)",
    "tag_RESERVED": "সংরক্ষিত (ক্লাস E)",
    "tag_CGNAT": "শেয়ার্ড ঠিকানা স্পেস (CGNAT)",
    "tag_UNSPECIFIED": "অনির্দিষ্ট ঠিকানা",
    "legacy_class": "লিগ্যাসি ক্লাস",
    "default_mask": "ডিফল্ট (ক্লাসফুল) প্রিফিক্স",
    "binary_view": "বাইনারি",
    "err": {
      "E_NOT_STRING": "অবৈধ ইনপুট।",
      "E_EMPTY": "একটি মান লিখুন।",
      "E_OCTET_COUNT": "IPv4 ঠিকানায় ঠিক ৪টি অক্টেট থাকতে হবে।",
      "E_BAD_OCTET": "অক্টেটে শুধু ০-৯ সংখ্যা থাকতে পারে।",
      "E_OCTET_RANGE": "প্রতিটি অক্টেট ০-২৫৫ এর মধ্যে হতে হবে।",
      "E_LEADING_ZERO": "অক্টেটের শুরুতে শূন্য থাকা যাবে না (যেমন 01)।",
      "E_BAD_PREFIX": "প্রিফিক্সে শুধু সংখ্যা থাকতে পারে।",
      "E_PREFIX_RANGE": "প্রিফিক্স ০-৩২ এর মধ্যে হতে হবে।",
      "E_CIDR_FORMAT": "address/prefix আকারে লিখুন, যেমন 10.0.0.5/8।",
      "E_SPLIT_COUNT": "সাবনেট সংখ্যা ১ থেকে ৬৫৫৩৬-এর মধ্যে পূর্ণসংখ্যা হতে হবে।",
      "E_SPLIT_TOO_MANY": "এত সাবনেটের জন্য /32-এর বেশি প্রিফিক্স লাগবে।",
      "E_SPLIT_PREFIX": "নতুন প্রিফিক্স নেটওয়ার্ক প্রিফিক্স থেকে ৩২-এর মধ্যে হতে হবে।"
    },
    "lang_toggle": "English",
    "offline_note": "১০০% অফলাইন — আপনি যা লিখবেন তা এই পেজ ছাড়বে না।",
    "footer": "ব্যক্তিগত অফলাইন নেটওয়ার্কিং টুল হিসেবে তৈরি। সাবনেট গণিত স্ট্যান্ডার্ড IPv4 নিয়ম অনুসরণ করে।"
  }
}

def esc(s):
    return json.dumps(s, ensure_ascii=True)[1:-1]

out = ["/* i18n strings - generated by gen_i18n.py; pure ASCII (Bengali as uXXXX escapes). */",
       "(function(){",
       "var I18N = {en:{},bn:{}};"]
for lang in ("en", "bn"):
    for k, v in STR[lang].items():
        if k == "err":
            for ek, ev in v.items():
                out.append('I18N.%s.err = I18N.%s.err || {};' % (lang, lang))
                out.append('I18N.%s.err["%s"] = "%s";' % (lang, ek, esc(ev)))
        else:
            out.append('I18N.%s["%s"] = "%s";' % (lang, k, esc(v)))
out.append("window.I18N = I18N;")
out.append("})();")

p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "js", "i18n.js")
with open(p, "w", encoding="ascii") as f:
    f.write("\n".join(out) + "\n")
data = open(p, "rb").read()
assert all(b < 128 for b in data), "non-ASCII leaked into i18n.js"
print("wrote", p, len(data), "bytes, pure ASCII")
