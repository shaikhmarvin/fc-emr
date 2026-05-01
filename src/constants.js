export const ROOM_OPTIONS = [
  { number: 1, label: "Room 1", area: "downstairs" },
  { number: 2, label: "Room 2", area: "downstairs" },
  { number: 3, label: "Room 3", area: "downstairs" },
  { number: 4, label: "Room 4", area: "downstairs" },
  { number: 5, label: "Room 5", area: "procedure room" },
  { number: 6, label: "Room 6", area: "downstairs" },
  { number: 7, label: "Room 7", area: "upstairs" },
  { number: 8, label: "Room 8", area: "upstairs" },
  { number: 9, label: "Room 9", area: "upstairs / no pap" },
  { number: 10, label: "Room 10", area: "upstairs / no pap" },
  { number: 11, label: "Room 11", area: "upstairs" },
  { number: 12, label: "Room 12", area: "upstairs" },
  { number: 13, label: "Room 13", area: "upstairs" },
  { number: 14, label: "Room 14", area: "upstairs" },
  { number: 15, label: "Room 15", area: "upstairs" },
];

export const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  preferredName: "",
  mrn: "",
  last4ssn: "",
  dob: "",
  age: "",
  phone: "",
  sex: "",
  ethnicity: "",
  pronouns: "",
  newReturning: "",
  ttuStudent: false,
  visitLocation: "",
  chiefComplaint: "",
  notes: "",
  transportation: "",
  needsElevator: false,
  spanishSpeaking: false,
  over65: false,
  mammogramStatus: "",
papStatus: "",
  fluShot: "",
  htn: false,
  dm: false,
  labsLast6Months: "",
  tobaccoScreening: "",
  dermatology: "N/A",
  ophthalmology: "N/A",
  optometry: "N/A",
  diabeticEyeExamPastYear: "N/A",
  physicalTherapy: "N/A",
  mentalHealthCombined: "N/A",
  counseling: "N/A",
  visitType: "general", // general | specialty_only | both
specialtyType: "", // pt | dermatology | mental_health | addiction
  anyMentalHealthPositive: false,
};

export const EMPTY_VITALS = {
  bp: "",
  hr: "",
  temp: "",
  rr: "",
  spo2: "",
  weight: "",
  height: "",
  bmi: "",
  pain: "",
};

export const EMPTY_MEDICATION = {
  name: "",
  dosage: "",
  frequency: "",
  route: "",
  dispenseAmount: "",
  startedDate: "",
  medicationStartedAt: "",
  refillCount: "",
  instructions: "",
  isActive: true,
};

export const EMPTY_SEARCH = {
  mrn: "",
  firstName: "",
  lastName: "",
  dob: "",
  last4ssn: "",
};
export const PT_TIME_SLOTS = [
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
];

export const PROGRAM_TYPES = [
  "Physical Therapy",
  "Dermatology",
  "Mental Health",
  "Addiction Medicine",
  "Counseling",
  "Mammogram"
];

export const PROGRAM_STATUSES = [
  "Interested",
  "Contacted",
  "Scheduled",
  "Completed",
  "No Show",
];