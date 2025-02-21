import { For, type Component } from "solid-js";

interface ITableProps {
  data?: ITablePropsEntry[];
}

export const Table: Component<ITableProps> = (props) => {
  return (
    <table>
      <tbody>
        <For each={props.data}>{(entry) => <Entry {...entry} />}</For>
      </tbody>
    </table>
  );
};

interface ITablePropsEntry {
  id: string;
  name: string;
}

const Entry: Component<ITablePropsEntry> = (props) => {

  const onClick= (props) => {
    alert(`id: ${props.id} name: ${props.name}`);
  }

  return (
    <tr onClick={() => onClick(props)}>
      <td>{props.id}</td>
      <td>{props.name}</td>
    </tr>
  );
};
