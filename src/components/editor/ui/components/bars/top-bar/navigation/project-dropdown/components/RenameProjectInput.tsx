import { Input } from "@/components/ui/input";

interface RenameProjectInputProps {
  name: string;
  setName: (name: string) => void;
}

const RenameProjectInput: React.FC<RenameProjectInputProps> = ({
  name,
  setName,
}) => {
  return (
    <Input
      id="name"
      type="text"
      value={name}
      autoCorrect="off"
      onChange={(e) => {
        //Limit the length of the name to 20 characters
        if (e.target.value.length > 20) {
          alert("Name should be less than or equal to 20 characters");
          return;
        } else if (e.target.value === "") {
          alert("Name cannot be empty");
          return;
        }
        setName(e.target.value);
      }}
      className="text-black dark:text-white bg-navbarBackground dark:bg-dark-navbarBackground"
    />
  );
};
export default RenameProjectInput;
