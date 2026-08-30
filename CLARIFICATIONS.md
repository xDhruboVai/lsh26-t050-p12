# Clarifications to the problem statements

Published with the problem set. These rules apply to every team and judges mark by them. Each carries the id of the
ruling it comes from.

## P02 Pharmacy Expiry Shelf Check
- `unit_price_bdt` in the sample data is the pharmacy's unit purchase price. (R-27)
- Value at risk = quantity multiplied by unit price. (R-27)
- "Expiring soon" value means the within 30 days group only: 0 to 30 days left, inclusive. Expired items are a
  separate group. (R-04)
- A returned item leaves the active counts and the active value totals. (R-24)

## P08 School Result Processing and GPA Engine
- Theory is out of 75 with a pass mark of 25. Practical is out of 25 with a pass mark of 8. Failing either part
  fails the subject: grade point 0. (R-11)
- Absent in a compulsory subject: show AB, subject grade point 0, overall result F. Absent in the optional subject:
  it contributes 0 and the student appears on the checking list. (R-12)
- GPA = (sum of the compulsory grade points + the larger of 0 and the optional grade point minus 2) divided by 6,
  capped at 5.00, shown to 2 decimal places. (R-13)
- Any compulsory failure gives GPA 0.00 and letter F; the uncancelled average stays visible in the calculation
  trace. (R-13)
- Letter grade from the final GPA: A+ = 5.00, A = 4.00 to 4.99, A- = 3.50 to 3.99, B = 3.00 to 3.49,
  C = 2.00 to 2.99, D = 1.00 to 1.99, F = fail. (R-10)
- Checking lists: optional list = every student whose optional grade point is 2.0 or below (an absent optional
  counts); practical fail list = every student with a practical part below 8 in any subject; absent list = every
  student with AB in any subject. A student can be on more than one list. (R-29)

## P10 Prepaid Meter Recharge Advisor
- Both recharge habits use identical daily consumption and the same calendar month slab counter. Recharge timing
  cannot create an energy rate saving. (R-16)
- "Cost" means the money the meter consumes: energy, VAT and the applicable monthly fixed charges. It is not the
  amount deposited. (R-33)
- The two results may legitimately be equal. Any difference can come only from how many monthly first recharge fixed
  charges occur. A fabricated slab saving is a failure. (R-16)
- The two habits: "low balance" recharges the case's amount at the start of any day whose balance is below the
  case's threshold; "monthly" recharges the case's amount on the 1st of each month. Both start from the case's
  opening balance and run the three named months. (R-33)

## Repositories, permitted tools and original work
- Each team uses exactly two participant-owned repositories, one for each of two different selected problems. Final
  names follow `lsh26-t###-p##`. Repositories may be created before 6:00 PM and may contain declared generic
  scaffolding. They stay private while the team works, become public before the Final Submission Form is sent, and
  remain public until results are announced.
- The first event-work commit in each repository adds `EVENT.md` with the event start code and any pre-event material.
  Teams preserve Git history through results.
- Generic frameworks, libraries and public boilerplates are allowed when declared. A pre-existing solution that
  substantially implements the selected problem's domain rules, calculations, data model, workflow or required
  behaviour is prohibited. Generic scaffolding receives no marks by itself.
- AI coding assistants are allowed when disclosed. The team remains responsible for understanding and verifying the
  work.

## Final submission, deadline and the early bonus
- Only the registered leader sends the Final Submission Form. One response covers both public repositories, their two
  exact 40-character commit SHAs and both live URLs.
- The Google Form server receipt time is the only official submission time. Commit times are not used. The exact SHAs
  entered in the controlling valid response are the versions judged.
- A team may send a correction before the deadline. The latest response received before 10:00 PM that passes every
  validation check controls. A later invalid response does not erase an earlier valid response.
- Only receipts before 10:00:00 PM are on time. A receipt at or after 10:00 PM is late and is not judged unless the
  controlled Form-outage procedure was reported before the deadline and accepted by the senior judge.
- The early bonus is one score per team, not per problem: 1.25 marks for each complete 30-minute block remaining
  before 10:00 PM, at most 10, after a universal 20-minute prayer allowance, and only when at least three of the four
  required items fully pass on both problems.
- A demo video is optional and limited to three minutes. If supplied, it briefly covers the problem-solving method and
  every member's major contribution. The same short method and contribution record is mandatory in the README and
  evaluation manifest even when no video is supplied.

## Demo and documentation, 15 marks
- Requirement proof 6, README reproducibility 5, decisions and limitations 2, licences and AI disclosure 2.
