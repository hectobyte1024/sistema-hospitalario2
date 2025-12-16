import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Lightbulb, Mouse, Keyboard } from 'lucide-react';

/**
 * Componente Tour Guiado para nuevos usuarios
 * Proporciona una introducción interactiva al sistema
 */
export default function GuidedTour({ userRole = 'nurse', onComplete }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya completó el tour
    const tourCompleted = localStorage.getItem(`tour_completed_${userRole}`);
    if (!tourCompleted) {
      // Mostrar el tour después de 1 segundo
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [userRole]);

  const tourSteps = {
    nurse: [
      {
        title: '¡Bienvenido al Sistema de Enfermería! 👋',
        description: 'Este tour te guiará por las principales funcionalidades del sistema para que puedas trabajar de forma eficiente.',
        icon: Lightbulb,
        tips: [
          'Navega usando el menú superior',
          'Usa atajos de teclado para acciones rápidas',
          'Todos los cambios se guardan automáticamente'
        ]
      },
      {
        title: 'Panel Principal 📊',
        description: 'Aquí verás tus pacientes asignados, signos vitales pendientes y tareas del turno.',
        icon: Mouse,
        tips: [
          'Los pacientes críticos aparecen destacados en rojo',
          'Los signos vitales vencidos se marcan con alerta',
          'Puedes filtrar por piso o servicio'
        ]
      },
      {
        title: 'Registro de Signos Vitales 🌡️',
        description: 'Registra temperatura, presión arterial, frecuencia cardíaca y respiratoria de forma rápida.',
        icon: Mouse,
        tips: [
          'Usa Tab para moverte entre campos',
          'El sistema valida rangos normales automáticamente',
          'Presiona Enter para guardar rápidamente'
        ]
      },
      {
        title: 'Administración de Medicamentos 💊',
        description: 'Registra la aplicación de medicamentos y tratamientos farmacológicos.',
        icon: Mouse,
        tips: [
          'Escanea códigos de barras para medicamentos',
          'Verifica alertas de alergias automáticamente',
          'Registra la hora exacta de aplicación'
        ]
      },
      {
        title: 'Tratamientos No Farmacológicos 🩹',
        description: 'Documenta curaciones, nebulizaciones, fluidoterapia y otros procedimientos.',
        icon: Mouse,
        tips: [
          '13 tipos de tratamientos disponibles',
          'Registra materiales utilizados',
          'Documenta observaciones importantes'
        ]
      },
      {
        title: 'Atajos de Teclado ⌨️',
        description: 'Usa atajos para trabajar más rápido y sin usar el mouse.',
        icon: Keyboard,
        tips: [
          'Ctrl + N: Nuevo registro',
          'Ctrl + S: Guardar cambios',
          'Ctrl + F: Buscar paciente',
          'Esc: Cerrar ventanas',
          'F1: Ayuda contextual'
        ]
      }
    ],
    doctor: [
      {
        title: '¡Bienvenido al Panel Médico! 👨‍⚕️',
        description: 'Este sistema te ayudará a gestionar consultas, diagnósticos y tratamientos de forma eficiente.',
        icon: Lightbulb,
        tips: [
          'Accede rápidamente al historial de pacientes',
          'Prescribe medicamentos con validación automática',
          'Consulta resultados de laboratorio integrados'
        ]
      },
      {
        title: 'Lista de Pacientes 📋',
        description: 'Ve todos tus pacientes asignados con información relevante.',
        icon: Mouse,
        tips: [
          'Filtra por condición o prioridad',
          'Haz clic en un paciente para ver detalles',
          'Los pacientes críticos aparecen primero'
        ]
      },
      {
        title: 'Historia Clínica 📖',
        description: 'Accede al historial médico completo del paciente.',
        icon: Mouse,
        tips: [
          'Ve consultas previas y diagnósticos',
          'Revisa estudios y análisis',
          'Consulta alergias y medicación actual'
        ]
      },
      {
        title: 'Prescripción de Medicamentos 💊',
        description: 'Prescribe tratamientos con validación automática de interacciones.',
        icon: Mouse,
        tips: [
          'El sistema verifica alergias automáticamente',
          'Sugiere dosis estándar por peso/edad',
          'Genera recetas electrónicas'
        ]
      }
    ],
    admin: [
      {
        title: '¡Bienvenido al Panel de Administración! ⚡',
        description: 'Gestiona usuarios, personal, recursos y obtén reportes del sistema.',
        icon: Lightbulb,
        tips: [
          'Monitorea el estado del sistema en tiempo real',
          'Gestiona permisos y roles de usuarios',
          'Genera reportes y estadísticas'
        ]
      },
      {
        title: 'Gestión de Usuarios 👥',
        description: 'Crea, modifica y administra cuentas de personal médico.',
        icon: Mouse,
        tips: [
          'Asigna roles: médico, enfermero, admin',
          'Controla permisos de acceso',
          'Desactiva cuentas sin eliminar datos'
        ]
      },
      {
        title: 'Estadísticas y Reportes 📊',
        description: 'Ve indicadores clave y genera reportes del hospital.',
        icon: Mouse,
        tips: [
          'Monitorea ocupación de camas',
          'Revisa citas y consultas diarias',
          'Exporta datos a Excel/PDF'
        ]
      }
    ]
  };

  const steps = tourSteps[userRole] || tourSteps.nurse;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsCompleted(true);
    localStorage.setItem(`tour_completed_${userRole}`, 'true');
    setTimeout(() => {
      setIsActive(false);
      if (onComplete) onComplete();
    }, 1500);
  };

  const skipTour = () => {
    localStorage.setItem(`tour_completed_${userRole}`, 'true');
    setIsActive(false);
  };

  if (!isActive) return null;

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn" />

      {/* Tour Card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4 animate-scaleIn">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white relative">
            <button
              onClick={skipTour}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Cerrar tour"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <StepIcon size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                    Paso {currentStep + 1} de {steps.length}
                  </span>
                </div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-8">
            {!isCompleted ? (
              <>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  {currentStepData.description}
                </p>

                {currentStepData.tips && currentStepData.tips.length > 0 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <Lightbulb size={20} className="text-blue-600" />
                      Consejos útiles:
                    </h3>
                    <ul className="space-y-2">
                      {currentStepData.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-blue-800">
                          <Check size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={skipTour}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Saltar tour
                  </button>

                  <div className="flex gap-3">
                    {currentStep > 0 && (
                      <button
                        onClick={handlePrevious}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                      >
                        Anterior
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-lg"
                    >
                      {currentStep === steps.length - 1 ? (
                        <>
                          <Check size={20} />
                          Finalizar
                        </>
                      ) : (
                        <>
                          Siguiente
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <Check size={40} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  ¡Tour Completado! 🎉
                </h3>
                <p className="text-gray-600">
                  Ya estás listo para usar el sistema de forma eficiente
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Botón para reiniciar el tour
 */
export function RestartTourButton({ userRole, className = '' }) {
  const handleRestart = () => {
    localStorage.removeItem(`tour_completed_${userRole}`);
    window.location.reload();
  };

  return (
    <button
      onClick={handleRestart}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors ${className}`}
    >
      <Lightbulb size={18} />
      Ver tour de introducción
    </button>
  );
}
