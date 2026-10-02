import ComingSoon from "@/components/ComingSoon";
export const metadata = { title: "Voice Guestbook · Cynthia's Wedding Plans" };
export default function Guestbook() {
  return (
    <ComingSoon
      numeral="III"
      title="Guestbook"
      script="wishes you can hear"
      body="Friends and family will leave a blessing, a story or some advice in their own voice, and it will become a keepsake for the couple."
      points={["Every message kept as audio and as words", "Gently grouped into prayers, advice and the funny ones", "A page the couple can play back on every anniversary"]}
    />
  );
}
