/* eslint-disable react/react-in-jsx-scope */
import { getSchools } from "~/server/queries";
import { NavBarBase } from "~/app/_components/navigation-client";

export const NavBar = async () => {
  const schools = await getSchools();
  return <NavBarBase schools={schools} />;
};
