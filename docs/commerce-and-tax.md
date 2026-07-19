# Commerce, tax, and pricing

Decisions and research for selling Steer. Written 2026-07-19.

**This is research, not advice.** Every finding below came from a web research
pass over primary sources (IRS instructions, eCFR, CRA folios, platform tax
docs). None of it was adversarially verified, and the tax conclusions need a
cross-border accountant before you act on them. Confidence levels and known
gaps are stated inline so a future reader does not mistake this for settled law.

## Decisions taken

- **Price is VAT-inclusive.** EU law requires the price shown to a consumer to
  be the final figure including tax (Consumer Rights Directive 2011/83, Price
  Indication Directive 98/6). Lemon Squeezy's tax-inclusive setting is **off by
  default and store-wide**, so it must be switched on deliberately.
- **EUR 19.99 at launch, rising to EUR 24.99.** Mirrors ControllerKeys, which
  goes 19.99 to 24.99. Inclusive at 19.99 Steer is well under CK at the till,
  since CK displays exclusive.
- **No LLC.** See below; it does not solve the problem it was meant to solve.
- **Stay on Lemon Squeezy for now, but keep the exit cheap.** See licensing.

### What VAT-inclusive actually costs

VAT comes out of the 19.99, then the platform fee applies to the gross. Lemon
Squeezy is `$0.50 + 5% + 1.5% international`, and the international surcharge
applies to essentially every sale here, so model ~6.5%.

| EU VAT | VAT out | LS fee | net |
|---|---|---|---|
| 20% | 3.33 | 1.80 | **14.86** |
| 21% | 3.47 | 1.80 | **14.72** |
| 25% | 4.00 | 1.80 | **14.20** |
| 27% | 4.25 | 1.80 | **13.94** |

Roughly EUR 14 to 15 reaches you from a EUR 19.99 sticker. At EUR 24.99 it is
about EUR 18.71 at 20% VAT.

### Site changes this implies

Flip the Lemon Squeezy inclusive setting and add "VAT included" to the pricing
card **in the same change**. The site lies if either lands without the other.
"Launch price" wording on the card makes the later rise honest rather than a
surprise.

## Platform status

**Lemon Squeezy is in maintenance, not dead.** Its CEO, 2026-01-28: *"Our goal
is to provide Lemon Squeezy users an easy way to migrate to Stripe Managed
Payments"*, and on the Stripe acquisition, *"that meant some tradeoffs for the
Lemon Squeezy community: slower support responses and less frequent product
updates."* No sunset date, no forced migration, no statement that it stops
operating. Confidence medium: this rests on one primary source, and it is six
months old on a situation the post itself describes as in motion.

**Stripe Managed Payments is the likely destination.** Documented by
2026-04-22: first-party merchant of record, indirect tax in 80+ countries,
Canada listed as an eligible business location, explicitly scoped to sellers who
sell directly (not via a marketplace) and sell a fully automated digital
product. Was waitlist-gated in January.

**Unverified and checkable in minutes:** whether Lemon Squeezy still onboards
new sellers, and whether Managed Payments has opened past its waitlist. Decide
these by trying, not by reading.

## Tax: why the W-8BEN problem dissolves

The worry was that a W-8BEN needs a country of tax residence and a foreign tax
number (FTIN), and Sean has neither. Three findings, all high confidence, all
from primary sources:

1. **The app is a sale of goods, not a royalty.** Treas. Reg. 1.861-18 forces
   every digital-content transaction into four exclusive categories. A
   single-user licence to run a finished app conveys none of the four copyright
   rights, so it is a transfer of a *copyrighted article*, which is a sale.
2. **Sale income is not FDAP.** Pub. 515: *"FDAP income is all income except:
   Gains from the sale of property."* So there is no chapter 3 withholding and
   nothing reportable on Form 1042-S.
3. **The FTIN rule binds banks, not shops.** Line 6a applies only to *"a U.S.
   office or branch of a depository institution, custodial institution,
   investment entity, or specified insurance company... documenting an account
   holder... of a financial account."* A merchant of record is none of those.

Lemon Squeezy corroborates: it collects the W-8 *"to confirm your tax residency
for 1099 reporting"*, and its 1099-K criteria require a US-based account, which
excludes a non-US W-8 filer entirely. Belt and braces: even characterised as a
royalty, copyright royalties are sourced where the property is *used*, so an app
used by non-US customers would not be US-source anyway.

**Practical:** W-8BEN with line 3 as where you actually are, FTIN blank with a
one-line margin explanation. Line 3 has an explicit fallback: *"If you do not
have a tax residence in any country, your permanent residence is where you
normally reside."*

**The one real risk:** a certificate judged incomplete or inconsistent triggers
automatic 30% withholding by default (Treas. Reg. 1.1441-7), not a query. Keep
the form simple and consistent with every other address the platform holds.

## Why an LLC does not help

A **single-member LLC is a disregarded entity**. The IRS looks through it to the
owner, so you file the same personal W-8BEN with the same blank FTIN and the
same address. Stated in four primary sources including the W-8BEN instructions
and Treas. Reg. 1.1441-1. It then *adds* a pro-forma Form 1120 plus Form 5472
every year, at **$25,000 per failure**. Downside with no upside.

It also does not improve appearances, which was the fallback argument: the
platform still gets the same personal form, and now runs KYC on the entity *and*
on you as a 25%+ owner. Two layers of scrutiny over one unchanged form.

**What would look clean is a corporation** with its own tax residency and tax
number, which is a different thing. Three candidates, none fully researched:

- **US LLC electing corporate taxation (Form 8832).** Would become a US person
  filing W-9 rather than W-8, with US corporate tax, 1120 and state franchise
  obligations following. **Entirely unsourced.** Directional inference only.
- **Estonian OU via e-Residency.** Genuinely gets its own tax residency by
  incorporation alone, with the 8-digit registration code serving as the TIN.
  But e-Residency confers no *personal* tax residency, and running the company
  from wherever you sit can trigger dual corporate residency through
  place-of-effective-management rules. Oversold for this case.
- **Canadian corporation.** Plausibly the cleanest while physically in Ontario,
  with no effective-management conflict and no Form 5472 exposure. **No Canadian
  corporate-residency source was retrieved**; this is reasoning from the general
  rule, not a finding.

## Residency

Initially it looked like CRA might still consider Sean a factual resident, which
would have made all of this routine (Folio S5-F1-C1 para 1.21: leaving without
establishing significant ties elsewhere means remaining Canadian ties *"may take
on greater significance"*). He has since confirmed **no significant Canadian
ties**, so that shortcut is out.

"Tax resident nowhere" remains a live question for an accountant. It affects
which country eventually taxes him; it does not appear to block getting paid.

## Known gaps

Do not treat this document as complete. Specifically unresearched or unresolved:

- Paddle's W-8 posture. Only its merchant-of-record explainer was retrieved.
- Whether Stripe Managed Payments withholds from non-US sellers. Absence of
  documented withholding is not documented absence of withholding.
- The Form 8832 corporate-election branch, entirely.
- UK, Canadian, and US state-level corporate costs and filing burdens.
- Canadian side: whether an MoR issues any CRA slip, and when the CAD 30,000
  small-supplier threshold forces GST/HST registration on MoR revenue.
- Zero first-hand seller reports were retrieved in any pass, so every claim
  about platform behaviour comes from vendor documentation.

## Licensing: decouple before launch

`Steer/Sources/Steer/Purchase/DirectLicensing.swift` already defines a
`LicenseValidator` protocol with `LemonSqueezyValidator` as one conformance, so
swapping provider is one implementation rather than a rewrite. Good.

The lock-in is **data, not code**: customer keys live in the provider's
database, so moving means re-issuing to every existing customer. Right now that
is zero customers, so it is free. After launch it is a support incident.

**Recommended before launch:** have the platform webhook trigger a key that you
sign yourself, and verify it offline in-app against an embedded public key. The
merchant of record then becomes a payment processor you can swap in an
afternoon. It also deletes the recurring licence check, which lets
`SteerCore/Strings.swift` and `privacy.html` drop the "validates periodically
afterwards" disclosure and simplifies the trust story, which is the site's
strongest asset.

Trade-off: offline-verifiable keys are harder to revoke. At EUR 19.99 with a
14-day trial, refund abuse is low stakes.
