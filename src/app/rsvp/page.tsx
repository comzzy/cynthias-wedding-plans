import ComingSoon from "@/components/ComingSoon";
export const metadata = { title: "Voice RSVP · Cynthia's Wedding Plans" };
export default function Rsvp() {
  return (
    <ComingSoon
      numeral="II"
      title="Voice RSVP"
      script="just say you're coming"
      body="Guests will open one link, tap once and tell us who's coming. No forms, no passwords, no “please resend the flyer”."
      points={["Names, number of people and food needs, captured from a voice note", "English or Pidgin, however they talk", "Lands straight in Cynthia's guest list and headcount"]}
    />
  );
}
