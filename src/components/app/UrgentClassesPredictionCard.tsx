import { Sparkles } from "lucide-react";

const students = [
  { name: "Riya Sharma", course: "Power BI", image: 47, initials: "RS" },
  { name: "Arjun Rao", course: "Data Science", image: 12, initials: "AR" },
  { name: "Sneha Patil", course: "Tableau", image: 44, initials: "SP" },
];

export function UrgentClassesPredictionCard({ className = "" }: { className?: string }) {
  return (
    <article className={`es-ai-card ${className}`}>
      <div className="es-ai-head">
        <span className="es-ai-title">
          <Sparkles size={18} />
          AI Prediction
        </span>
      </div>
      <p className="es-ai-message">Immediate action!</p>
      <div className="es-ai-body">
        <ul className="es-student-list">
          {students.map((student) => (
            <li key={student.name}>
              <img
                src={`https://i.pravatar.cc/80?img=${student.image}`}
                alt=""
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <span className="es-student-initials">{student.initials}</span>
              <span className="es-student-copy">
                <strong>{student.name}</strong>
                <small>{student.course}</small>
              </span>
            </li>
          ))}
        </ul>
        <div className="es-ai-orb" aria-label="AI brain illustration">
          <div className="es-orb-ring es-orb-ring-one" />
          <div className="es-orb-ring es-orb-ring-two" />
          <div className="es-orb-core">
            <span>🧠</span>
            <strong>AI</strong>
          </div>
          <i className="es-orb-spark spark-one" />
          <i className="es-orb-spark spark-two" />
          <i className="es-orb-spark spark-three" />
        </div>
      </div>
      <div className="es-ai-foot">
        <span className="es-ai-status">
          <i />
          Updated just now
        </span>
        <span>Powered by EduAI</span>
      </div>
    </article>
  );
}
