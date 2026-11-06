/**
 * 64 Districts of Bangladesh organized by popularity and division.
 * Dhaka is pinned at the top as it determines the INSIDE_DHAKA delivery rate (৳70).
 */

export const BD_DISTRICTS = [
  // Pinned Top (Inside Dhaka)
  { name: "Dhaka", division: "Dhaka", zone: "INSIDE_DHAKA", popular: true },

  // Major Metropolitan Centers
  { name: "Chattogram", division: "Chittagong", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Sylhet", division: "Sylhet", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Rajshahi", division: "Rajshahi", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Khulna", division: "Khulna", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Barishal", division: "Barisal", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Rangpur", division: "Rangpur", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Mymensingh", division: "Mymensingh", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Cumilla", division: "Chittagong", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Gazipur", division: "Dhaka", zone: "OUTSIDE_DHAKA", popular: true },
  { name: "Narayanganj", division: "Dhaka", zone: "OUTSIDE_DHAKA", popular: true },

  // Dhaka Division
  { name: "Faridpur", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Gopalganj", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Kishoreganj", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Madaripur", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Manikganj", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Munshiganj", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Narsingdi", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Rajbari", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Shariatpur", division: "Dhaka", zone: "OUTSIDE_DHAKA" },
  { name: "Tangail", division: "Dhaka", zone: "OUTSIDE_DHAKA" },

  // Chittagong Division
  { name: "Bandarban", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Brahmanbaria", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Chandpur", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Cox's Bazar", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Feni", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Khagrachhari", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Lakshmipur", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Noakhali", division: "Chittagong", zone: "OUTSIDE_DHAKA" },
  { name: "Rangamati", division: "Chittagong", zone: "OUTSIDE_DHAKA" },

  // Sylhet Division
  { name: "Habiganj", division: "Sylhet", zone: "OUTSIDE_DHAKA" },
  { name: "Moulvibazar", division: "Sylhet", zone: "OUTSIDE_DHAKA" },
  { name: "Sunamganj", division: "Sylhet", zone: "OUTSIDE_DHAKA" },

  // Rajshahi Division
  { name: "Bogura", division: "Rajshahi", zone: "OUTSIDE_DHAKA" },
  { name: "Joypurhat", division: "Rajshahi", zone: "OUTSIDE_DHAKA" },
  { name: "Naogaon", division: "Rajshahi", zone: "OUTSIDE_DHAKA" },
  { name: "Natore", division: "Rajshahi", zone: "OUTSIDE_DHAKA" },
  { name: "Chapainawabganj", division: "Rajshahi", zone: "OUTSIDE_DHAKA" },
  { name: "Pabna", division: "Rajshahi", zone: "OUTSIDE_DHAKA" },
  { name: "Sirajganj", division: "Rajshahi", zone: "OUTSIDE_DHAKA" },

  // Khulna Division
  { name: "Bagerhat", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Chuadanga", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Jashore", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Jhenaidah", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Kushtia", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Magura", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Meherpur", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Narail", division: "Khulna", zone: "OUTSIDE_DHAKA" },
  { name: "Satkhira", division: "Khulna", zone: "OUTSIDE_DHAKA" },

  // Barisal Division
  { name: "Barguna", division: "Barisal", zone: "OUTSIDE_DHAKA" },
  { name: "Bhola", division: "Barisal", zone: "OUTSIDE_DHAKA" },
  { name: "Jhalokati", division: "Barisal", zone: "OUTSIDE_DHAKA" },
  { name: "Patuakhali", division: "Barisal", zone: "OUTSIDE_DHAKA" },
  { name: "Pirojpur", division: "Barisal", zone: "OUTSIDE_DHAKA" },

  // Rangpur Division
  { name: "Dinajpur", division: "Rangpur", zone: "OUTSIDE_DHAKA" },
  { name: "Gaibandha", division: "Rangpur", zone: "OUTSIDE_DHAKA" },
  { name: "Kurigram", division: "Rangpur", zone: "OUTSIDE_DHAKA" },
  { name: "Lalmonirhat", division: "Rangpur", zone: "OUTSIDE_DHAKA" },
  { name: "Nilphamari", division: "Rangpur", zone: "OUTSIDE_DHAKA" },
  { name: "Panchagarh", division: "Rangpur", zone: "OUTSIDE_DHAKA" },
  { name: "Thakurgaon", division: "Rangpur", zone: "OUTSIDE_DHAKA" },

  // Mymensingh Division
  { name: "Jamalpur", division: "Mymensingh", zone: "OUTSIDE_DHAKA" },
  { name: "Netrokona", division: "Mymensingh", zone: "OUTSIDE_DHAKA" },
  { name: "Sherpur", division: "Mymensingh", zone: "OUTSIDE_DHAKA" },
];

export function getDistrictInfo(districtName) {
  if (!districtName) return null;
  const normalized = districtName.trim().toLowerCase();
  return BD_DISTRICTS.find((d) => d.name.toLowerCase() === normalized) || null;
}

