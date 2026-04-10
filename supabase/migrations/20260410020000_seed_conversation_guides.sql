-- ============================================================
-- Seed conversation_guides with global starter content
-- ============================================================

INSERT INTO public.conversation_guides (category, title, severity, context, do_list, dont_list, script, follow_up, is_global, sort_order)
VALUES
(
  'safety',
  'Employee Refuses to Follow Safety Protocol',
  'high',
  'An employee is observed skipping required safety steps such as anchoring, wearing PPE, or performing pre-event inspections. This is a critical safety issue that must be addressed immediately.',
  ARRAY['Pull the employee aside privately', 'Stay calm and factual — describe what you observed', 'Reference the specific safety rule or SOP', 'Explain the potential consequences (injury, liability, termination)', 'Ask if they need additional training or support', 'Document the conversation'],
  ARRAY['Don''t yell or embarrass them in front of others', 'Don''t ignore it or "let it slide this time"', 'Don''t make it personal — focus on the behavior', 'Don''t threaten without following through'],
  'Hey [Name], I need to talk to you about something I noticed during setup today. I saw that [specific behavior]. I know it might seem like a small thing, but our safety protocols exist to protect you, the team, and our customers. Can you walk me through why that step was skipped? ... I need you to commit to following the full procedure every time going forward. Is there anything you need from me to make that happen?',
  'Follow up within 48 hours to observe compliance. If the behavior repeats, escalate to a written warning per company policy. Document all conversations.',
  true,
  1
),
(
  'customer',
  'Angry Customer Demanding a Refund',
  'high',
  'A customer is upset about a service issue (late delivery, equipment malfunction, weather cancellation) and is demanding a full refund. They may be raising their voice or threatening negative reviews.',
  ARRAY['Listen actively without interrupting', 'Acknowledge their frustration sincerely', 'Apologize for the inconvenience', 'Offer a specific solution (partial refund, reschedule, credit)', 'Stay calm and professional regardless of their tone', 'Document the resolution'],
  ARRAY['Don''t argue or get defensive', 'Don''t make promises you can''t keep', 'Don''t take it personally', 'Don''t blame other team members in front of the customer', 'Don''t ignore their complaint or dismiss their feelings'],
  'I completely understand your frustration, and I''m sorry this happened. Let me make this right for you. Here''s what I can do: [offer specific solution]. I want to make sure you have a great experience with us, and I take this seriously. Can we work together on a solution that works for you?',
  'Send a follow-up email within 24 hours confirming the resolution. Consider a goodwill gesture (discount on next booking). Log the incident for internal review.',
  true,
  2
),
(
  'performance',
  'Employee Consistently Late to Shifts',
  'moderate',
  'An employee has been late to their scheduled shifts multiple times. This affects event setup timelines, team morale, and customer satisfaction.',
  ARRAY['Have a private one-on-one conversation', 'Reference specific dates and times they were late', 'Ask if there are underlying issues (transportation, scheduling conflicts)', 'Set clear expectations going forward', 'Offer reasonable accommodations if possible', 'Document the conversation and agreed-upon plan'],
  ARRAY['Don''t call them out in front of the team', 'Don''t assume the reason — ask first', 'Don''t let it continue without addressing it', 'Don''t compare them to other employees'],
  'Hey [Name], I wanted to check in with you. I''ve noticed you''ve been arriving late on [specific dates]. I want to understand what''s going on — is there something making it difficult to get here on time? ... Going forward, I need you here by [time] for every shift. What can we do together to make that happen?',
  'Monitor attendance for the next 2 weeks. If improvement is shown, acknowledge it positively. If lateness continues, move to a formal written warning.',
  true,
  3
),
(
  'safety',
  'Reporting a Workplace Injury or Near-Miss',
  'high',
  'An employee has been injured on the job or a near-miss incident occurred. This requires immediate attention, proper documentation, and a supportive conversation.',
  ARRAY['Ensure the employee receives medical attention first', 'Express genuine concern for their wellbeing', 'Complete an incident report together while details are fresh', 'Identify what went wrong and how to prevent it', 'Report to appropriate authorities if required', 'Follow up on their recovery'],
  ARRAY['Don''t blame the employee immediately', 'Don''t skip the documentation', 'Don''t discourage them from reporting', 'Don''t minimize the incident', 'Don''t delay medical attention for paperwork'],
  'First, are you okay? Let''s make sure you get the care you need. ... When you''re ready, I''d like to go through what happened so we can document it properly and make sure this doesn''t happen again. Your safety is our top priority, and I appreciate you reporting this.',
  'Complete the incident report within 24 hours. Review safety procedures with the full team. Implement any corrective actions identified. Check in with the injured employee regularly during recovery.',
  true,
  4
),
(
  'customer',
  'Customer Complains About Staff Behavior',
  'moderate',
  'A customer has reported that a staff member was rude, unprofessional, or behaved inappropriately at an event. This needs to be investigated and addressed with both the customer and the employee.',
  ARRAY['Thank the customer for bringing it to your attention', 'Apologize sincerely for the experience', 'Assure them you will investigate and address it', 'Speak with the employee privately to get their side', 'Take appropriate corrective action', 'Follow up with the customer on the resolution'],
  ARRAY['Don''t dismiss the customer''s complaint', 'Don''t confront the employee in front of others', 'Don''t take sides before hearing both perspectives', 'Don''t promise to fire someone on the spot'],
  'To the customer: Thank you for letting me know about this. I''m truly sorry for that experience — that is not the standard we hold ourselves to. I will personally look into this and follow up with you. ... To the employee: I received feedback about [specific behavior] at the event. I want to hear your perspective on what happened.',
  'Follow up with the customer within 48 hours. Document the incident. If the employee behavior is confirmed, provide coaching or formal warning as appropriate. Consider additional customer service training for the team.',
  true,
  5
),
(
  'performance',
  'Letting Go of an Underperforming Employee',
  'high',
  'After multiple coaching conversations and documented warnings, an employee has not improved their performance. It''s time to have the termination conversation.',
  ARRAY['Prepare all documentation beforehand', 'Have a witness present (HR or another manager)', 'Be direct and clear — don''t beat around the bush', 'Show empathy but remain firm', 'Explain final pay, benefits, and next steps', 'Collect company property and access credentials'],
  ARRAY['Don''t do it on a Friday (give them weekdays to process)', 'Don''t apologize excessively or waver', 'Don''t get into a debate about the decision', 'Don''t do it in a public area', 'Don''t make it personal — keep it about performance'],
  '[Name], thank you for coming in. I want to be straightforward with you. Despite our previous conversations on [dates] about [specific issues], we haven''t seen the improvement we need. We''ve made the decision to end your employment, effective today. I know this is difficult, and I want to handle this with respect. Here''s what happens next regarding your final paycheck and any benefits...',
  'Process final paycheck per state requirements. Remove system access immediately. Notify the team professionally without sharing details. Document everything for company records.',
  true,
  6
);
