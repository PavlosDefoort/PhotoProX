import Layout from "@/components/settings/Layout";
import type { GetStaticPaths, GetStaticProps } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const STATIC_SETTING_PAGES = [
  "general",
  "accessibility",
  "preferences",
  "developer",
  "performance",
  "appearance",
  "models",
] as const;

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: STATIC_SETTING_PAGES.map((setting) => ({ params: { setting } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async () => ({ props: {} });

const SettingPage: React.FC = () => {
  // Get the current state of the user's settings

  const router = useRouter();
  // Get the setting/[setting] string from the URL
  const { setting } = router.query;

  // Ensure setting is always treated as a string
  const settingString = Array.isArray(setting)
    ? setting[0]
    : setting || "general";

  // Capitalize the first letter of setting
  const settingCapitalized =
    settingString.charAt(0).toUpperCase() + settingString.slice(1);

  const SettingComponent = dynamic(
    () =>
      import(`../../components/settings/${settingCapitalized}`).then(
        (module) => module.default
      ),
    { loading: () => <div>Loading...</div> }
  );

  return (
    <Layout>
      <SettingComponent />
    </Layout>
  );
};

export default SettingPage;
