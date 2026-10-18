import { Link } from "react-router-dom";
import styles from "./Auth.module.css";

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          📖
        </div>
        <p className={styles.logo}>Page not found</p>
        <p className={styles.sub}>
          That page does not exist — or it belongs to a club you are not in.
        </p>
        <p className={styles.center}>
          <Link to="/clubs" className={styles.linkButton}>
            Back to your clubs
          </Link>
        </p>
      </div>
    </div>
  );
}
