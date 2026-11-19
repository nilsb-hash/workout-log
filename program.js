// Built-in program, transcribed from "Phase2Workout Blank.pdf" (Bay 2 Bay 18-1S, Phase 2).
// Exercises can be edited in the app; this is only the starting point.
window.DEFAULT_PROGRAM = {
  id: "phase2",
  name: "Phase 2 – Athletic Development",
  weeks: "7–12",
  info: "Choose 2 of 4 workouts each week",
  esd: "10 min bike, HR > 110",
  workouts: [
    {
      id: "A", title: "Rotational Power & Pull Strength",
      note: "/side = each side. KB = kettlebell. DB = dumbbell.",
      blocks: [
        { name: "Rotational Power", exercises: [
          ["Military Press Bar or DB", "3 × 8–10"],
          ["Kneeling KB or Plate Rotations", "2 × 10–15/side"],
          ["Lateral Lunge KB", "3 × 8/side"] ] },
        { name: "Upper Body Pull", exercises: [
          ["Weighted Chin-Ups / Chin-Ups", "3 × 6–10"],
          ["Chest Supported Row", "3 × 10"],
          ["Face Pull", "3 × 12"],
          ["Incline Bench Press DB", "3 × 8–10"] ] },
        { name: "Trunk & Shoulder Prevention", exercises: [
          ["Pallof Press", "3 × 10/side"],
          ["Half Turkish Get-Up KB", "2 × 3/side"],
          ["Hanging Knee Raise", "2 × 10"] ] }
      ]
    },
    {
      id: "B", title: "Posterior Chain & Pulling Strength",
      note: "/side = each side. KB = kettlebell. DB = dumbbell.",
      blocks: [
        { name: "Hinge & Unilateral Strength", exercises: [
          ["Barbell RDL", "3 × 8"],
          ["Reverse Lunge KB", "3 × 8/side"],
          ["Side Plank Rotation (weighted opt.)", "2 × 8/side"] ] },
        { name: "Back & Pull Volume", exercises: [
          ["Lat Pulldown", "3 × 10"],
          ["Seated Cable Row", "3 × 10"],
          ["Bent Over Reverse Fly", "2 × 12"] ] },
        { name: "Rotational Control & Carry", exercises: [
          ["Half-Kneeling Cable Rotation", "3 × 10/side"],
          ["Suitcase Carry KB", "3 × 20m/side"],
          ["Kneeling Cable Crunch", "2 × 15–20"] ] }
      ]
    },
    {
      id: "C", title: "Explosive Power & Athletic Strength",
      note: "*Clean to Press only if you have shown appropriate technique. Alternative: DB Push Press, 3 × 6.",
      blocks: [
        { name: "Jump & Reactive Strength", exercises: [
          ["Back Squat", "3 × 5–7"],
          ["Pogo Jumps", "3 × 10"],
          ["Approach Jump Onto Box", "3 × 10"] ] },
        { name: "Full Body Strength", exercises: [
          ["Clean to Press* or DB Push Press", "3 × 5–7"],
          ["Pull-Ups / Chin-Ups", "3 × 10–15"],
          ["Single-Arm DB Row", "3 × 10/side"] ] },
        { name: "Rotational Stability & Prevention", exercises: [
          ["Anti-Rotation Row (plank) KB", "3 × 10/side"],
          ["Around-the-Body Pass KB", "2 × 8/side"],
          ["DB External Rotation", "2 × 12/side"] ] }
      ]
    },
    {
      id: "D", title: "Full Body Strength & Accessory Development",
      note: "A1 + A2 superset: 10 explosive vertical jumps right after each deadlift set, controlled landing. Rest 2–3 min between rounds.",
      blocks: [
        { name: "Lower Body Strength & Explosive Power", exercises: [
          ["Hex Bar Deadlift (or KB Deadlift)", "3 × 5–8"],
          ["Vertical Jumps (superset)", "3 × 10"] ] },
        { name: "Lower & Upper Body Strength", exercises: [
          ["Leg Extensions", "3 × 10"],
          ["Eccentric Calf Raises (machine or DB)", "3 × 8"],
          ["Weighted Push-Ups", "3 × 8"] ] },
        { name: "Upper Body & Arms Accessory", exercises: [
          ["DB Lateral Raises", "3 × 12"],
          ["Cable Chest Fly", "2 × 12"],
          ["Incline Bicep Curl", "3 × 10"] ] }
      ]
    }
  ]
};
