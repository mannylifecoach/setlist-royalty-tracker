// BMI Live DOM selectors — centralized so they're easy to update if BMI changes their UI
// These are best-guess selectors based on typical form patterns for ols.bmi.com

export const SELECTORS = {
  // Step 1 — Details
  bandPerformer: 'select[name="performer"], #performer, [data-field="performer"]',
  eventName: 'input[name="eventName"], #eventName, [data-field="eventName"]',
  eventType: 'select[name="eventType"], #eventType, [data-field="eventType"]',

  startDate: 'input[name="startDate"], #startDate, [data-field="startDate"]',
  startHour: 'select[name="startHour"], #startHour, [data-field="startHour"]',
  startAmPm: 'select[name="startAmPm"], #startAmPm, [data-field="startAmPm"]',

  endDate: 'input[name="endDate"], #endDate, [data-field="endDate"]',
  endHour: 'select[name="endHour"], #endHour, [data-field="endHour"]',
  endAmPm: 'select[name="endAmPm"], #endAmPm, [data-field="endAmPm"]',

  attendance: 'select[name="attendance"], #attendance, [data-field="attendance"]',
  ticketCharge: 'input[name="ticketCharge"], [data-field="ticketCharge"]',

  // Venue
  previousVenues: 'select[name="previousVenue"], #previousVenue, [data-field="previousVenue"]',
  venueState: 'select[name="venueState"], #venueState, [data-field="venueState"]',
  venueCity: 'input[name="venueCity"], #venueCity, [data-field="venueCity"]',
  venueName: 'input[name="venueName"], #venueName, [data-field="venueName"]',

  // Create New Venue modal
  newVenueName: '#newVenueName, input[name="newVenueName"]',
  newVenueAddress: '#newVenueAddress, input[name="newVenueAddress"]',
  newVenueState: '#newVenueState, select[name="newVenueState"]',
  newVenueCity: '#newVenueCity, input[name="newVenueCity"]',
  newVenueZip: '#newVenueZip, input[name="newVenueZip"]',
  newVenueType: '#newVenueType, select[name="newVenueType"]',
  newVenueCapacity: '#newVenueCapacity, input[name="newVenueCapacity"]',
  newVenuePhone: '#newVenuePhone, input[name="newVenuePhone"]',

  // Step 2 — Setlist
  songSearchInput: 'input[name="songSearch"], #songSearch, [data-field="songSearch"]',
  songListItems: '.song-list-item, [data-song-title], .setlist-song',
  songAddButton: '.add-song-btn, button[data-action="add-song"], .song-list-item button',

  // Navigation
  nextButton: 'button.next, button[data-action="next"], .wizard-next',
  submitButton: 'button[type="submit"], button[data-action="submit"]',
  certificationCheckbox: 'input[type="checkbox"][name="certification"], #certification',
} as const;
