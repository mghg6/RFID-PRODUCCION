
import { Autocomplete } from '@mui/material';
import jsPDF from 'jspdf';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Button, IconButton, MenuItem, Select, TextField, Typography, Modal, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import './etiquetadoquality_produccion.scss';
import Swal from 'sweetalert2';
import { styled } from '@mui/material/styles';
import QRCode from "qrcode";
import qualityImage from "../../../assets/quality.png";

interface Area {
  id: number;
  area: string;
}

interface Maquina {
  id: number;
  maquina: string;
  area: number;
  no: string;
}

interface Producto {
  claveProducto: string;
  producto: string;
}

interface Turno {
  id: number;
  turno: string;
}

interface Operador {
  id: number;
  nombreCompleto: string;
  numNomina: string;
}

interface Orden {
  id: number;
  orden: string;
  claveProducto: string;
  producto: string;
  areaId: number;
  unidad: string;
  customerPO?: string;
  itemDescription?: string;
  itemNumber?: string;
  claveUnidad:string;
}
interface EtiquetaData {
  claveProducto: string;
  nombreProducto: string;
  pesoBruto: number;
  pesoNeto: number;
  orden: string;
  fecha: string;
}

interface Printer {
  name: string;
  ip: string;
}

interface RfidLabel {
  trazabilidad: string;
}

const EtiquetadoQuality_produccion: React.FC = () => {
  const navigate = useNavigate();
  const [areas, setAreas] = useState<Area[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [filteredMaquinas, setFilteredMaquinas] = useState<Maquina[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<number | undefined>();
  const [selectedTurno, setSelectedTurno] = useState<number | undefined>();
  const [selectedMaquina, setSelectedMaquina] = useState<number | undefined>();
  const [selectedOrden, setSelectedOrden] = useState<number | undefined>();
  const [pesoBruto, setPesoBruto] = useState<number | undefined>();
  const [pesoNeto, setPesoNeto] = useState<number | undefined>();
  const [pesoTarima, setPesoTarima] = useState<number | undefined>();
  const [piezas, setPiezas] = useState<number | undefined>();
  const [selectedOperador, setSelectedOperador] = useState<number | undefined>();
  const [openModal, setOpenModal] = useState(false);
  /*const [currentDate, setCurrentDate] = useState<string>('');*/
  const [trazabilidad, setTrazabilidad] = useState<string>('');
  const [rfid, setRfid] = useState<string>('');
  const [unidad, setUnidad] = useState('Piezas');
  const [date, setDate] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [traceabilityCode, setTraceabilityCode] = useState('');
  const [qtyUOM, setQtyUOM] = useState<number | undefined>();
  const [totalQtyPallet, setTotalQtyPallet] = useState<number | ''>('');
  const [shippingUnits, setShippingUnits] = useState<number | undefined>();
  const [customer, setCustomer] = useState<string>('');
  const [item, setItem] = useState<string>('');
  const [qpsItemNumber, setQpsItemNumber] = useState<string>('');
  const [lot, setLot] = useState<number | ''>('');
  const [numeroTarimaGenerado, setNumeroTarimaGenerado] = useState('');
  const [claveUnidad, setClaveUnidad] = useState('Unidad');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [inputValue, setInputValue] = useState<string>('');  
 

  const printerOptions = [
    { name: "Impresora 1", ip: "172.16.20.56" },
    { name: "Impresora 2", ip: "172.16.20.57" },
  ];


  
  


  const handlePesoTarimaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0 && value <= 52) {
      setPesoTarima(value);
    } else {
      console.error('El valor debe estar entre 0 y 52.');
      // Aquí puedes elegir restablecer el valor al mínimo permitido o simplemente ignorar la entrada.
      setPesoTarima(Math.max(Math.min(value, 52), 0));
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Assuming you want to keep the date in 'yyyy-MM-dd' format in the state
    setDate(event.target.value);
  };

  useEffect(() => {
    axios.get<Area[]>('http://172.16.10.31/api/Area').then(response => {
      setAreas(response.data);
    });
    axios.get<Turno[]>('http://172.16.10.31/api/Turn').then(response => {
      setTurnos(response.data);
    });
  }, []);

  useEffect(() => {
    if (selectedArea) {
      const areaName = areas.find(a => a.id === selectedArea)?.area ;
      axios.get<Orden[]>(`http://172.16.10.31/api/Order/${areaName}`).then(response => {
        setOrdenes(response.data);
      });

      axios.get<Maquina[]>(`http://172.16.10.31/api/Machine/${selectedArea}`)
        .then(response => {
          setFilteredMaquinas(response.data);
        })
        .catch(error => {
          console.error('Error fetching machines for area ID:', selectedArea, error);
          setFilteredMaquinas([]); // Limpia las máquinas si hay un error
        });
    } else {
      setOrdenes([]);
      setFilteredMaquinas([]);
    }
  }, [selectedArea, areas]);

  useEffect(() => {
    if (selectedArea) {
      axios.get<Operador[]>(`http://172.16.10.31/api/Operator?IdArea=${selectedArea}`)
        .then(response => {
          setOperadores(response.data);
        })
        .catch(error => console.error('Error fetching data:', error));
    }
  }, [selectedArea]);

  useEffect(() => {
    if (selectedArea && selectedOrden) {
      axios.get<Orden[]>(`http://172.16.10.31/api/Order?areaId=${selectedArea}`).then(response => {
        const orden = response.data.find(orden => orden.id === selectedOrden);
        if (orden) {
          const productoConcatenado = `${orden.claveProducto} ${orden.producto}`;
          setFilteredProductos(productoConcatenado); 
          setUnidad(orden.unidad || "default_unit"); 
  
          const validKeys = ["MIL", "XBX", "H87"];
          const nuevaClaveUnidadLocal = validKeys.includes(orden.claveUnidad) ? orden.claveUnidad : "Pzas";
          setClaveUnidad(nuevaClaveUnidadLocal);
  
          let filteredItem = orden.producto;
  
          // Extract the QPS Item Number by matching "P" followed by numbers and/or letters
          const extractedQPSItemNumber = filteredItem.match(/P\d+[A-Z]*\d*/)?.[0] || '';
  
          // Set the QPS Item Number
          setQpsItemNumber(extractedQPSItemNumber);
  
          // Remove the QPS Item Number from the product string
          filteredItem = filteredItem.replace(extractedQPSItemNumber, '').trim();
  
          // Remove "(QUALITY)" if present
          filteredItem = filteredItem.replace(/\(QUALITY\)/g, '');
  
          setItem(filteredItem); // Set the cleaned product name
        }
      });
    }
  }, [selectedArea, selectedOrden]);
  
  useEffect(() => {
    Swal.fire({
      icon: 'info',
      title: 'Actualización',
      text: 'A partir de ahora, ya se genera automáticamente el rótulo que se utiliza en PT y también las 4 hojas que pide el cliente que se coloquen en la tarima.',
      confirmButtonText: 'Entendido'
    });
  }, []);

  useEffect(() => {
    setPiezas(totalQtyPallet || 0);
  }, [totalQtyPallet]);

  useEffect(() => {
    const generateTraceabilityCode = () => {
          const machine = filteredMaquinas.find(m => m.id === selectedMaquina);
          const machineCode = machine ? machine.no.padStart(2, '0') : '00';

          // Extrae los componentes de la fecha directamente de la cadena 'date'
          const year = date.slice(0, 4);
          const month = date.slice(5, 7);
          const day = date.slice(8, 10);

          const formattedDate = `${day}${month}${year.slice(-2)}`;
          const formattedNumeroTarima = numeroTarimaGenerado;

          const newTraceabilityCode = `${machineCode}${formattedDate}${formattedNumeroTarima}`;
          setTraceabilityCode(newTraceabilityCode);
      };

      generateTraceabilityCode();
  }, [selectedMaquina, date, numeroTarimaGenerado, filteredMaquinas]);

  const handleOpenModal = () => {
    {/*const today = new Date();
    const formattedDate = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    setCurrentDate(formattedDate);*/}
    generateBothCodes();// Generar trazabilidad y RFID antes de abrir el modal
    setOpenModal(true);
  };

  const handleCloseModal = () => setOpenModal(false);

  const handleGenerateEtiqueta = () => {
    // Verificamos que los pesos bruto y neto no sean iguales y manejen las otras condiciones
    if (pesoBruto !== undefined && pesoNeto !== undefined) {
        if (pesoBruto < pesoNeto) {
            Swal.fire({
                icon: 'error',
                title: 'Validación de Pesos',
                text: 'El peso bruto no puede ser menor que el peso neto.',
            });
            return; // Detiene la ejecución si la validación falla
        }

        if (pesoNeto > pesoBruto) {
            Swal.fire({
                icon: 'error',
                title: 'Validación de Pesos',
                text: 'El peso neto no puede ser mayor que el peso bruto.',
            });
            return; // Detiene la ejecución si la validación falla
        }

        if (pesoBruto === pesoNeto) {
            Swal.fire({
                icon: 'warning',
                title: 'Validación de Pesos Idénticos',
                text: 'El peso bruto y el peso neto no deben ser iguales.',
            });
            return; // Detiene la ejecución si los pesos son iguales
        }
    }

    // Si todas las validaciones pasan, entonces procede a generar la etiqueta
    handleOpenModal();
};


  const generateTrazabilidad = async () => {
    const base = '2';
    const areaMap: { [key: string]: string } = {
      'EXTRUSIÓN': '1', 'IMPRESIÓN': '2', 'REFILADO': '3', 'BOLSEO': '4',
      'VASO': '5', 'POUCH': '6', 'LAMINADO 1': '7', 'CINTA': '8', 'DIGITAL': '9',
    };

    const selectedAreaName = areas.find(a => a.id === selectedArea)?.area || '';
    const areaCode = areaMap[selectedAreaName as keyof typeof areaMap] || '0';
    const maquinaNo = filteredMaquinas.find(m => m.id === selectedMaquina)?.no || '00';
    const maquinaCode = maquinaNo.toString().padStart(2, '0');
    const ordenNo = ordenes.find(o => o.id === selectedOrden)?.orden || '000000';
    const ordenCode = ordenNo.toString().padStart(6, '0');
    const partialTrazabilidad = `${base}${areaCode}${maquinaCode}${ordenCode}`;

    try {
        const response = await axios.get<RfidLabel[]>('http://172.16.10.31/api/RfidLabel');
        const rfidLabels: RfidLabel[] = response.data;

        const matchedLabels = rfidLabels.filter((label: RfidLabel) => 
            label.trazabilidad.startsWith(partialTrazabilidad) && label.trazabilidad.length === 13
        );
        const consecutivos = matchedLabels.map((label: RfidLabel) => 
            parseInt(label.trazabilidad.slice(-3))
        );
        const nextConsecutivo = (consecutivos.length > 0 ? Math.max(...consecutivos) : 0) + 1;
        const consecutivoStr = nextConsecutivo.toString().padStart(3, '0');

        const fullTrazabilidad = `${partialTrazabilidad}${consecutivoStr}`;
        setTrazabilidad(fullTrazabilidad);
        setRfid(`000${fullTrazabilidad}`);

        return consecutivoStr; // Devuelve el valor de consecutivoStr
    } catch (error) {
        console.error('Error fetching RfidLabel data:', error);
        const defaultConsecutivo = '001';
        setTrazabilidad(`${partialTrazabilidad}${defaultConsecutivo}`);
        setRfid(`000${partialTrazabilidad}${defaultConsecutivo}`);

        return defaultConsecutivo; // Devuelve el valor por defecto
    }
};

const generateBothCodes = async () => {
    const consecutivoStr = await generateTrazabilidad();
    
    const machine = filteredMaquinas.find(m => m.id === selectedMaquina);
    const machineCode = machine ? machine.no.padStart(2, '0') : '00';

    const year = date.slice(0, 4);
    const month = date.slice(5, 7);
    const day = date.slice(8, 10);

    const formattedDate = `${day}${month}${year.slice(-2)}`;
    const formattedNumeroTarima = consecutivoStr;

    const newTraceabilityCode = `${machineCode}${formattedDate}${formattedNumeroTarima}`;
    setTraceabilityCode(newTraceabilityCode);
};

const resetValores = () => {
  setSelectedArea(undefined);
  setSelectedTurno(undefined);
  setSelectedMaquina(undefined);
  setSelectedOrden(undefined);
  setPesoBruto(undefined);
  setPesoNeto(undefined);
  setPesoTarima(undefined);
  setPiezas(undefined);
  setSelectedOperador(undefined);
  setTrazabilidad('');
  setRfid('');
  setUnidad('Piezas');
  setDate('');
  setTraceabilityCode('');
  setQtyUOM(undefined);
  setTotalQtyPallet('');
  setShippingUnits(undefined);
  setCustomer('');
  setItem('');
  setQpsItemNumber('');
  setLot('');
  setNumeroTarimaGenerado('');
  setClaveUnidad('Unidad');
  setFilteredProductos('');
  setResetKey(prevKey => prevKey + 1);  // Incrementa la key para forzar rerender
};


  const resetForm = () => {
    setPesoBruto(undefined);
    setPesoNeto(undefined);
    setPesoTarima(undefined);
    setPiezas(undefined);
    setUnidad('Cajas');
    setQtyUOM(undefined);
    setTotalQtyPallet('');
    setShippingUnits(undefined);
    setResetKey(prevKey => prevKey + 1);  // Incrementa la key para forzar rerender
  };

  const RedButton = styled(Button)({
    backgroundColor: 'red',
    color: 'white',
    '&:hover': {
      backgroundColor: 'darkred',
    },
  });
  
  const generatePDF = (data: EtiquetaData) => { //MODIFICAR ROTULO
    const { claveProducto, nombreProducto, pesoBruto, orden, fecha } = data;
    
    let piezasParaPDF = piezas; // Asumimos que `piezas` ya está definido en el estado
    if (claveUnidad === "MIL") {
      piezasParaPDF = piezasParaPDF ? piezasParaPDF / 1000 : 0;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'  // Puedes ajustar el tamaño de página según necesites
    });
  
    // Función para dividir y ajustar texto largo en varias líneas
    const splitText = (text: string, x: number, y: number, fontSize: number, maxWidth: number): number => {
      doc.setFontSize(fontSize);
      const lines: string[] = doc.splitTextToSize(text, maxWidth); // Divide el texto para que se ajuste al ancho máximo
      lines.forEach((line: string) => {  // Aquí se especifica el tipo de 'line' como 'string'
        doc.text(line, x, y);
        y += fontSize * 0.4; // Aumentar 'y' para la siguiente línea basada en el tamaño de la fuente
      });
      return y; // Retorna la nueva posición 'y' después de las líneas
    };
  
    doc.setFontSize(150);
    doc.text(`${claveProducto}`, 25, 45);

    let currentY = 80; // Inicio de la posición Y para 'Nombre del Producto'
    currentY = splitText(nombreProducto, 10, currentY, 45, 260); // Tamaño de fuente 60 y ancho máximo de 260mm

    doc.setFontSize(40);
    doc.text(`LOTE:${orden}`, 20, 161);
    doc.text(`${fecha} `, 155, 161);

    doc.text(`KGM`, 80, 180);

    doc.setFontSize(80);
    doc.text(`${pesoNeto}`, 5, 207);
    doc.text(`${piezasParaPDF} ${claveUnidad}`, 122, 207);

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(5, 55, 275, 55);
    doc.line(5, 145, 275, 145);
    doc.line(5, 167, 275, 167);
    doc.line(117, 167, 117, 210);
    window.open(doc.output('bloburl'), '_blank');
  };

  
  const generatePDFWithQr = async (data: EtiquetaData) => {

    const doc = new jsPDF({
      orientation: "landscape", // Ajustado para mejor ajuste del contenido
      unit: "mm",
      format: "A4", // Formato más estándar para documentos
    });

    doc.setFontSize(12);
    doc.text(`Customer:`, 7, 40);
    doc.text(`Item:`, 7, 54);
    doc.text(`QPS ITEM #: `, 7, 67);
    doc.text(`Lot:`, 182, 67);
    doc.text(`Total QTY/Pallet(Eaches)`, 182, 118);
    doc.text(`Traceability:`, 7, 174);
    doc.text(`GROSS WEIGHT:`, 7, 186);
    doc.text(`NET WEIGHT:`, 152, 186);

    doc.setFontSize(24);
    doc.text(`${customer}`, 30, 43);
    doc.setFontSize(28);
    doc.text(`${item}`, 20, 58);

    doc.setFontSize(22);
    doc.text(`${lot}`, 220, 110);
    doc.text(`${totalQtyPallet}`, 223, 163);
    doc.text(`${qpsItemNumber}`, 65, 163);
    doc.setFontSize(40);
    doc.text(`${traceabilityCode}`, 35, 178);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    //lineas del contorno

    doc.setFontSize(90);
    doc.text(`${pesoBruto}`, 50, 204);
    doc.text(`${pesoNeto}`, 190, 204);

    doc.line(5, 5, 290, 5);
    doc.line(290, 5, 290, 205);
    doc.line(5, 205, 290, 205);
    doc.line(5, 5, 5, 205);
    //lineas interiores
    doc.line(5, 30, 290, 30);
    doc.line(5, 45, 290, 45);
    doc.line(5, 60, 290, 60);
    doc.line(5, 165, 290, 165);
    doc.line(5, 180, 290, 180);
    doc.line(180, 112.5, 290, 112.5);
    //Lineas De enmedio
    doc.line(180, 60, 180, 165);
    doc.line(150, 180, 150, 205);

    // Carga y añade la imagen al PDF
    doc.addImage(qualityImage, "PNG", 50, 5, 200, 27);

    // Función para agregar un QR
    const addQRToPDF = async (text: string, x: number, y: number, size: number = 20) => {
      try {
        const url = await QRCode.toDataURL(text, { scale: 4 }); // Ajusta la escala según necesidades
        doc.addImage(url, "JPEG", x, y, size, size);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    // Generar QR Codes
    await addQRToPDF(lot.toString(), 214, 64, 38);
    await addQRToPDF(`${totalQtyPallet}`, 214, 119, 38);
    await addQRToPDF(qpsItemNumber, 38, 61, 96);

    doc.save("etiqueta.pdf");
  };

 


  const handleConfirmEtiqueta = () => {
    // Si ya se está enviando, no hacemos nada.
    if (isSubmitting) return;

    // Verificar si la impresora está seleccionada
    if (!selectedPrinter) {
        Swal.fire({
            icon: 'warning',
            title: 'Impresora no seleccionada',
            text: 'Por favor, seleccione una impresora.',
        });
        return;
    }

    // Establecer el estado de envío para evitar clics múltiples
    setIsSubmitting(true);

    const url = `http://172.16.10.31/Printer/QualityPrinterIP?ip=${selectedPrinter.ip}`;
    const area = areas.find(a => a.id === selectedArea)?.area;
    const orden = ordenes.find(o => o.id === selectedOrden)?.orden.toString() ?? "";
    const maquina = filteredMaquinas.find(m => m.id === selectedMaquina)?.maquina;
    const producto = filteredProductos;
    const turno = turnos.find(t => t.id === selectedTurno)?.turno;
    const operadorSeleccionado = operadores.find(o => o.id === selectedOperador);

    const data = {
        area: area || '',
        claveProducto: producto.split(' ')[0],
        nombreProducto: producto.split(' ').slice(1).join(' '),
        claveOperador: operadorSeleccionado ? operadorSeleccionado.numNomina : '',
        operador: operadorSeleccionado ? `${operadorSeleccionado.numNomina} - ${operadorSeleccionado.nombreCompleto}` : '',
        turno: turno || '',
        pesoTarima: pesoTarima !== undefined ? pesoTarima : '',
        pesoBruto: pesoBruto || 0,
        pesoNeto: pesoNeto || 0,
        piezas: piezas || 0,
        trazabilidad: trazabilidad,
        orden: orden || "",
        rfid: rfid,
        status: 1,
        uom: unidad,
        fecha: date,
        postExtraQuality: {
            individualUnits: qtyUOM || 0,
            itemDescription: item, // Tomado directamente del estado
            itemNumber: qpsItemNumber,
            totalUnits: totalQtyPallet || 0,
            shippingUnits: shippingUnits || 0,
            inventoryLot: lot.toString(),
            customer: customer,
            traceability: traceabilityCode
        }
    };

    // Validación de peso bruto y peso neto
    if (data.pesoBruto === 0 || data.pesoNeto === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Pesos inválidos',
            text: 'El peso bruto y el peso neto no pueden ser 0.',
        });
        setIsSubmitting(false); // Rehabilitar el botón
        return;
    }

    const requiredFields = [
        { name: 'Área', value: data.area },
        { name: 'Clave de Producto', value: data.claveProducto },
        { name: 'Nombre de Producto', value: data.nombreProducto },
        { name: 'Clave de Operador', value: data.claveOperador },
        { name: 'Operador', value: data.operador },
        { name: 'Turno', value: data.turno },
        { name: 'Peso Tarima', value: data.pesoTarima },
        { name: 'Peso Bruto', value: data.pesoBruto },
        { name: 'Peso Neto', value: data.pesoNeto },
        { name: 'Piezas', value: data.piezas },
        { name: 'Trazabilidad', value: data.trazabilidad },
        { name: 'Orden', value: data.orden },
        { name: 'RFID', value: data.rfid },
        { name: 'UOM', value: data.uom },
        { name: 'Fecha', value: data.fecha },
        { name: 'Individual Units', value: data.postExtraQuality.individualUnits },
        { name: 'Item Description', value: data.postExtraQuality.itemDescription },
        { name: 'Item Number', value: data.postExtraQuality.itemNumber },
        { name: 'Total Units', value: data.postExtraQuality.totalUnits },
        { name: 'Shipping Units', value: data.postExtraQuality.shippingUnits },
        { name: 'Inventory Lot', value: data.postExtraQuality.inventoryLot },
        { name: 'Customer', value: data.postExtraQuality.customer },
        { name: 'Traceability', value: data.postExtraQuality.traceability }
    ];

    const emptyFields = requiredFields.filter(field => field.value === null || field.value === undefined || field.value === '');

    if (emptyFields.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos incompletos',
            text: `Por favor, complete los siguientes campos: ${emptyFields.map(field => field.name).join(', ')}.`,
        });
        setIsSubmitting(false); // Rehabilitar el botón
        return;
    }

    axios.post(url, data)
        .then(response => {
            Swal.fire({
                icon: 'success',
                title: 'Etiqueta generada',
                text: 'La etiqueta se ha generado correctamente.',
            });
            resetForm();
            handleCloseModal();
            generatePDF(data);
            generatePDFWithQr(data);
        })
        .catch(error => {
          // Obtener el mensaje de error específico del backend
          const errorMessage = error.response && error.response.data
              ? error.response.data
              : 'Hubo un error al generar la etiqueta.';
    
          // Verificar si el mensaje contiene el texto específico de "no está validada"
          if (errorMessage.includes("no está validada")) {
              Swal.fire({
                  icon: 'error',
                  title: 'Esta orden no esta validada',
                  text: 'Para validar esta orden es necesario que acudas a programación.',
              });
          } else {
              Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: errorMessage,
              });
          }
    
          console.error('Error al generar la etiqueta:', error);
      })
      .finally(() => {
          setIsSubmitting(false); // Rehabilitar el botón al finalizar el proceso
      });
};
  return (
    <div className='impresion-container-quality'>
      <Box className='top-container-bfx'>
        <IconButton onClick={() => navigate('/ModulosImpresionQuality')} className='button-back'>
          <ArrowBackIcon sx={{ fontSize: 40, color: '#46707e' }} />
        </IconButton>
      </Box>
      <Box className='impresion-card-destiny'>
        
        <Typography variant="h5" sx={{ textAlign: 'center', mb: 2 }}>
          GENERACION ETIQUETA FORMATO QUALITY
        </Typography>
        <Box className='impresion-form-destiny'>
        <TextField
        type="date"
        value={date}
        onChange={handleDateChange}
        InputLabelProps={{
          shrink: true,
        }}/>
          <Autocomplete
              value={areas.find(area => area.id === selectedArea)}
              onChange={(event, newValue) => setSelectedArea(newValue?.id)}
              options={areas}
              getOptionLabel={(option) => option.area}
              renderInput={(params) => <TextField {...params} label="Área" fullWidth />}
          />
          {/* 
          <Autocomplete
            value={ordenes.find(o => o.id === selectedOrden)}
            onChange={(event, newValue) => setSelectedOrden(newValue?.id)}
            options={ordenes}
            getOptionLabel={(option) => option.orden.toString() + " - " + option.claveProducto + " " + option.producto}
            renderInput={(params) => <TextField {...params} label="Orden" />}
            noOptionsText={
              inputValue.length >= 5 ? (
                <span style={{ color: "red", padding: "8px" }}>La orden no encuentra una ruta de proceso</span>
              ) : (
                "No hay opciones"
              )
            }
            inputValue={inputValue}
            onInputChange={(event, newValue) => setInputValue(newValue)}
          />
          */}
          
          <Autocomplete
            value={ordenes.find(o => o.id === selectedOrden) || null}
            onChange={(event, newValue) => setSelectedOrden(newValue?.id)}  // Actualiza el valor seleccionado
            options={ordenes}
            getOptionLabel={(option) => `${option.orden} - ${option.claveProducto} ${option.producto}`}
            inputValue={inputValue}  // Vínculo del input con el valor del estado
            onInputChange={(event, newInputValue) => setInputValue(newInputValue)}  // Actualiza el valor del input
            renderInput={(params) => <TextField {...params} label="Orden" />}
            noOptionsText={
              inputValue.length === 5 ? (  // Muestra el mensaje solo si tiene exactamente 5 caracteres
                <span style={{ color: 'red' }}>La Orden no encuentra una ruta de proceso</span>
              ) : ""
            }
          />

          


          <Autocomplete
              value={filteredMaquinas.find(m => m.id === selectedMaquina)}
              onChange={(event, newValue) => setSelectedMaquina(newValue?.id)}
              options={filteredMaquinas}
              getOptionLabel={(option) => option.maquina}
              renderInput={(params) => <TextField {...params} label="Máquina" />}
          />
          <TextField
              fullWidth
              label="Producto"
              value={filteredProductos}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
          />
            <Autocomplete
                value={turnos.find(t => t.id === selectedTurno)}
                onChange={(event, newValue) => setSelectedTurno(newValue?.id)}
                options={turnos}
                getOptionLabel={(option) => option.turno}
                renderInput={(params) => <TextField {...params} label="Turno" />}
            />

            <Autocomplete
                value={operadores.find(o => o.id === selectedOperador)}
                onChange={(event, newValue) => setSelectedOperador(newValue?.id)}
                options={operadores}
                getOptionLabel={(option) => `${option.numNomina} - ${option.nombreCompleto}`}
                renderInput={(params) => <TextField {...params} label="Operador" />}
            />
                    <TextField
              key={`peso-bruto-${resetKey}`}
              fullWidth
              label="PESO BRUTO"
              variant="outlined"
              type="number"
              value={pesoBruto === undefined ? '' : pesoBruto}  // Asegúrate de manejar correctamente undefined
              onChange={(event) => setPesoBruto(event.target.value === '' ? undefined : parseFloat(event.target.value))}
          />

          <TextField
              key={`peso-neto-${resetKey}`}
              fullWidth
              label="PESO NETO"
              variant="outlined"
              type="number"
              value={pesoNeto === undefined ? '' : pesoNeto}  // Asegúrate de manejar correctamente undefined
              onChange={(event) => setPesoNeto(event.target.value === '' ? undefined : parseFloat(event.target.value))}
          />

          <TextField
              key={`peso-tarima-${resetKey}`}
              fullWidth
              label="PESO TARIMA"
              variant="outlined"
              type="number"
              value={pesoTarima}
              onChange={handlePesoTarimaChange}
          />
          {/* <TextField
            key={`piezas-${resetKey}`}
            fullWidth
            label="#"
            variant="outlined"
            type="number"
            value={piezas || ''}
            onChange={e => setPiezas(Math.max(0, parseFloat(e.target.value) || 0))}
            inputProps={{ min: 0 }}
          /> */}

          <TextField
            key={`shipping-units-${resetKey}`}
            fullWidth
            label="CANTIDAD DE CAJAS / Shipping Units"
            variant="outlined"
            type="number"
            value={shippingUnits || ''}
            onChange={e => setShippingUnits(Math.max(0, parseFloat(e.target.value) || 0))}
            inputProps={{ min: 0 }}
          />

          <TextField
              label="Unidad"
              value={unidad} // Utiliza la variable de estado `unidad`
              InputProps={{
                readOnly: true, 
              }}
              variant="outlined"
            />
          <TextField
            fullWidth
            label="Customer"
            variant="outlined"
            value={customer}
            onChange={e => setCustomer(e.target.value)}
          />

          <TextField
            fullWidth
            label="Item"
            variant="outlined"
            value={item}
            onChange={e => setItem(e.target.value)}
            InputProps={{
                readOnly: true,
            }}
          />

          <TextField
            fullWidth
            label="QPS ITEM#"
            variant="outlined"
            value={qpsItemNumber}
            onChange={e => setQpsItemNumber(e.target.value)}
          />

          <TextField
            fullWidth
            label="Lot"
            variant="outlined"
            type="number"
            value={lot || ''}
            onChange={e => setLot(Math.max(0, parseFloat(e.target.value) || 0))}
            inputProps={{
              min: 0, // Asegura que no se puedan ingresar números negativos
            }}
          />

          <TextField
            key={`qty-uom-${resetKey}`}
            fullWidth
            label="PIEZAS POR CAJA / Qty/UOM(Eaches)"
            variant="outlined"
            type="number"
            value={qtyUOM || ''}
            onChange={e => setQtyUOM(Math.max(0, parseFloat(e.target.value) || 0))}
            inputProps={{ min: 0 }}
          />
          <TextField
            key={`total-qty-pallet-${resetKey}`}
            fullWidth
            label="TOTAL DE PIEZAS / Total Qty/Pallet"
            variant="outlined"
            type="number"
            value={totalQtyPallet}
            onChange={e =>setTotalQtyPallet(Math.max(0, parseFloat(e.target.value) || 0))}
            inputProps={{min: 0}}
          />
          <TextField
              fullWidth
              label="TRACEABILITY CODE"
              variant="outlined"
              type="text"
              value={traceabilityCode}
              InputProps={{
                readOnly: true,
              }}
            />
        </Box>
        <Box className='impresion-button-destiny'>
          <RedButton variant="contained" onClick={resetValores}>
            RESETEAR VALORES
          </RedButton>
          <Button variant="contained" className="generate-button" onClick={handleGenerateEtiqueta} style={{ zIndex: 1050 }}>
            VISTA PREVIA
          </Button>
      </Box>
      </Box>
      <Modal open={openModal} onClose={handleCloseModal} style={{ zIndex: 1050 }}>
        <Paper className="quality-modal-content">
            <Box className="quality-modal-header">
                <Typography variant="h6">Detalle Etiqueta Quality</Typography>
                <IconButton onClick={handleCloseModal}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Box className="quality-modal-body">
                <div className="row">
                    <Typography><strong>Customer:</strong></Typography>
                    <Typography>{customer}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>Item:</strong></Typography>
                    <Typography>{item}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>QPS Item#:</strong></Typography>
                    <Typography>{qpsItemNumber}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>Lot:</strong></Typography>
                    <Typography>{lot}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>Total Qty/Pallet:</strong></Typography>
                    <Typography>{totalQtyPallet}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>Traceability Code:</strong></Typography>
                    <Typography>{traceabilityCode}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>Peso Bruto:</strong></Typography>
                    <Typography>{pesoBruto}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>Peso Neto:</strong></Typography>
                    <Typography>{pesoNeto}</Typography>
                </div>
                <div className="row">
                    <Typography><strong>Trazabilidad:</strong></Typography>
                    <Typography>{trazabilidad}</Typography>
                </div>
            </Box>
            <Box className="quality-modal-footer">
            <Autocomplete
              value={selectedPrinter}
              onChange={(event, newValue: Printer | null) => {
                setSelectedPrinter(newValue);  // Directly set the new value
              }}
              options={printerOptions} // Ensure printerOptions is of type Printer[]
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Printer" 
                  fullWidth 
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      height: '60px' // Ajusta la altura del campo de entrada
                    } 
                  }} 
                />
              )}
              sx={{ 
                width: '180px', // Ajusta el ancho del componente
                '& .MuiAutocomplete-inputRoot': { 
                  height: '60px' // Ajusta la altura del componente Autocomplete
                } 
              }}
            />
                <Button variant="contained" color="primary" onClick={handleConfirmEtiqueta}>
                    Confirmar e Imprimir
                </Button>
            </Box>
        </Paper>
    </Modal>

    </div>
  );
};

export default EtiquetadoQuality_produccion;
